#!/bin/bash
# state-enforcement.sh
# Stop hook: blocks task completion if source files changed but
# memory/progress.md was NOT updated. Part of the memory system.
#
# Skipped if memory/progress.md doesn't exist (memory system not
# installed) or if we're not in a git repo.
#
# No stop_hook_active bypass. A retry does not make a missing progress
# update disappear. The only way out is to stage/commit progress.md,
# or to delete memory/progress.md and opt out of the memory layer.
#
# Hook output contract: exit 0 + JSON block decision on stdout. Earlier
# versions mixed JSON with exit 2, which Claude silently discarded.

# Read and discard stdin.
cat > /dev/null

[ -f "memory/progress.md" ] || exit 0
git rev-parse --is-inside-work-tree &>/dev/null || exit 0

MODIFIED_FILES=$(
  {
    git diff --name-only 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    # Untracked files too — a brand-new source file still counts as a change
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u
)

# Exclusions: tooling, docs, agent scratch state (.agent/), and the
# directive-alias files that the installer copies from AGENT.md.
SOURCE_CHANGED=$(
  echo "$MODIFIED_FILES" \
    | grep -vE '^(memory/|docs/|\.agent/|\.agent-md/|\.agents/|\.claude/|\.codex/|\.cursor/|\.githooks/|\.windsurf/|README\.md$|LICENSE$|AGENT\.md$|AGENTS\.md$|CLAUDE\.md$|agent-md\.toml(\.example)?$)' \
    | grep -v '^$' \
    | grep -cvE '\.md$'
)
SOURCE_CHANGED=${SOURCE_CHANGED:-0}

if [ "$SOURCE_CHANGED" -eq 0 ]; then
  exit 0
fi

PROGRESS_CHANGED=$(echo "$MODIFIED_FILES" | grep -c '^memory/progress\.md$')
PROGRESS_CHANGED=${PROGRESS_CHANGED:-0}

if [ "$PROGRESS_CHANGED" -eq 0 ]; then
  REASON="State enforcement: ${SOURCE_CHANGED} source file(s) modified but memory/progress.md was not updated. Update progress.md to reflect completed atomic tasks before finishing, or state explicitly why this work did not require progress tracking."
  jq -n --arg r "$REASON" '{decision: "block", reason: $r}'
  exit 0
fi

exit 0
