#!/bin/bash
# tdd-check.sh
# PostToolUse soft-warning: flags when a new export/function/class was
# added to a non-test file without a matching test file. Warns only —
# doesn't block — because the test-first ordering isn't reliably
# detectable from a single hook invocation.
#
# Handles untracked files: `git diff` sees nothing on a brand-new file,
# so we fall back to scanning the whole file for export-like lines.

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')
[ -z "$FILE_PATH" ] && exit 0

# Skip test files, config, docs, hooks themselves
case "$FILE_PATH" in
  *.test.*|*.spec.*|*__tests__*|*/test/*|*/tests/*) exit 0 ;;
  *.config.*|*/docs/*|*/memory/*|*/.claude/*|*/.githooks/*|*/.agent/*) exit 0 ;;
  *.md|*.json|*.yml|*.yaml|*.toml) exit 0 ;;
esac

# Only source files we care about
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.go) : ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

# Pattern matches export-like declarations across supported languages.
# Anchored with `\+` for diff lines and `^` for whole-file mode.
EXPORT_DIFF_RE='^\+[[:space:]]*(export[[:space:]]+(async[[:space:]]+)?(function|class|const|let)|def[[:space:]]+[A-Za-z_]|pub[[:space:]]+fn|func[[:space:]]+[A-Za-z_])'
EXPORT_FILE_RE='^[[:space:]]*(export[[:space:]]+(async[[:space:]]+)?(function|class|const|let)|def[[:space:]]+[A-Za-z_]|pub[[:space:]]+fn|func[[:space:]]+[A-Za-z_])'

NEW_EXPORTS=0
IS_TRACKED=0
if git rev-parse --is-inside-work-tree &>/dev/null; then
  if git ls-files --error-unmatch "$FILE_PATH" &>/dev/null; then
    IS_TRACKED=1
  fi
fi

if [ "$IS_TRACKED" -eq 1 ]; then
  if git diff "$FILE_PATH" 2>/dev/null | grep -qE "$EXPORT_DIFF_RE"; then
    NEW_EXPORTS=1
  fi
else
  # Untracked or not in git — inspect the whole file. Everything in an
  # untracked file is "new" by definition.
  if grep -qE "$EXPORT_FILE_RE" "$FILE_PATH"; then
    NEW_EXPORTS=1
  fi
fi

[ "$NEW_EXPORTS" -eq 0 ] && exit 0

# Look for a matching test file
DIR=$(dirname "$FILE_PATH")
BASE=$(basename "$FILE_PATH")
STEM="${BASE%.*}"
EXT="${BASE##*.}"

CANDIDATES=(
  "$DIR/$STEM.test.$EXT"
  "$DIR/$STEM.spec.$EXT"
  "$DIR/__tests__/$STEM.test.$EXT"
  "$DIR/__tests__/$STEM.spec.$EXT"
  "$DIR/../tests/test_$STEM.py"
  "$DIR/../test/test_$STEM.py"
  "$DIR/test_$STEM.py"
)

for C in "${CANDIDATES[@]}"; do
  if [ -f "$C" ]; then
    exit 0  # A test file exists — soft check passes
  fi
done

MSG="TDD check: new export(s) in $FILE_PATH but no matching test file found. Per Red-Green TDD: write the failing test first, then the implementation. If this is refactor-only, note it in memory/progress.md."
jq -n --arg m "$MSG" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
exit 0
