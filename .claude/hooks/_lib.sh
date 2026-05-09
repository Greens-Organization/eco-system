#!/bin/bash
# _lib.sh — shared helpers for agent-md hooks.
# Source this from other hooks:  . "$(dirname "$0")/_lib.sh"
#
# Kept minimal on purpose — shell, not Python, so hooks stay dependency-free.
# All functions are safe to call with `set -u` enabled.

# read_toml <file> <section> <key>
# Prints the value or nothing. Handles `key = "value"` or `key = value`.
# Skips lines after `#`. Not a full TOML parser — just enough for our use.
read_toml() {
  local file="$1" section="$2" key="$3"
  [ -f "$file" ] || return 0
  awk -v section="$section" -v key="$key" '
    BEGIN { in_sec = 0 }
    /^[[:space:]]*#/ { next }
    /^[[:space:]]*\[/ {
      sec = $0
      sub(/^[[:space:]]*\[/, "", sec); sub(/\][[:space:]]*$/, "", sec)
      gsub(/[[:space:]]/, "", sec)
      in_sec = (sec == section) ? 1 : 0
      next
    }
    in_sec && index($0, "=") > 0 {
      k = substr($0, 1, index($0, "=") - 1)
      v = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", k)
      sub(/[[:space:]]*#.*$/, "", v)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", v)
      if (k == key) {
        if (v ~ /^".*"$/)      { gsub(/^"|"$/, "", v) }
        else if (v ~ /^'\''.*'\''$/) { gsub(/^'\''|'\''$/, "", v) }
        print v
        exit
      }
    }
  ' "$file"
}

# toml_path — location of the config file (override with AGENT_MD_TOML env)
toml_path() {
  echo "${AGENT_MD_TOML:-agent-md.toml}"
}

# stat_mtime <path> — portable mtime in epoch seconds (Linux + macOS).
stat_mtime() {
  stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null
}

# file_size <path> — portable byte size (Linux + macOS).
file_size() {
  stat -c %s "$1" 2>/dev/null || stat -f %z "$1" 2>/dev/null
}

# compact_errors <max_lines> — stdin pipeline filter.
# Strips ANSI escapes, drops progress/decoration lines, keeps signal
# (compiler errors, lint rule headers, parse/format diags, Failed:).
# Caps to <max_lines>; appends "...N more lines" footer if truncated.
# Falls back to head -<max_lines> if filtering yields nothing (defensive).
compact_errors() {
  local max="${1:-10}"
  local raw filtered count
  raw=$(sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/[[:space:]]*[━─]+[[:space:]]*$//; s/[[:space:]]+FIXABLE[[:space:]]*$//' \
        | grep -vE '^[[:space:]]*$' \
        | grep -vE '^(•|Tasks:|Cached:|Time:|  Time:|  Tasks:|  Cached:)' \
        | grep -vE '(cache miss|cache hit|replaying logs|executing |Remote caching)' \
        | grep -vE '^[[:space:]]+i [A-Z]|^[[:space:]]*[0-9]+[[:space:]]+│|^[[:space:]]*>[[:space:]]+[0-9]+ │|^[[:space:]]+│|^[[:space:]]*\.+ │|Safe fix:|Unsafe fix:' \
        | grep -vE '^[[:space:]]*[━─]+[[:space:]]*$|^FIXABLE[[:space:]]*$')
  filtered=$(echo "$raw" | grep -E '(error TS[0-9]+|error:|warning:|FAIL|×|✖|lint/|assist/|parse|format|^Failed:|^.*:[0-9]+:[0-9]+[[:space:]]|^[^[:space:]].*\.(ts|tsx|js|jsx|mjs|cjs|json|css|svelte|vue|astro|py|rs|go))')
  if [ -z "$filtered" ]; then
    filtered=$(echo "$raw" | head -n "$max")
  fi
  count=$(echo "$filtered" | grep -c .)
  if [ "$count" -gt "$max" ]; then
    echo "$filtered" | head -n "$max"
    echo "... $((count - max)) more line(s) (re-run command to see all)"
  else
    echo "$filtered"
  fi
}

# detect_pm — prints the detected Node package manager based on lockfile,
# or nothing. Order: pnpm > yarn > bun > npm > (nothing).
detect_pm() {
  if   [ -f "pnpm-lock.yaml" ];                       then echo pnpm
  elif [ -f "yarn.lock" ];                            then echo yarn
  elif [ -f "bun.lockb" ] || [ -f "bun.lock" ];       then echo bun
  elif [ -f "package-lock.json" ] || [ -f "package.json" ]; then echo npm
  fi
}

# npm_test_cmd — prints the test-runner invocation for the detected PM,
# or nothing if no JS project was detected.
npm_test_cmd() {
  case "$(detect_pm)" in
    pnpm) echo "pnpm test --silent" ;;
    yarn) echo "yarn test --silent" ;;
    bun)  echo "bun test" ;;
    npm)  echo "npm test --silent" ;;
    *)    echo "" ;;
  esac
}

# has_npm_test_script — returns 0 if package.json declares a real test script.
has_npm_test_script() {
  [ -f "package.json" ] || return 1
  local t
  t=$(jq -r '.scripts.test // empty' package.json 2>/dev/null)
  [ -n "$t" ] && [ "$t" != 'echo "Error: no test specified" && exit 1' ]
}

# visual_evidence_ok <artifacts_dir> <freshness_seconds>
# Returns 0 when there's at least one fresh, non-empty markdown evidence
# file in <artifacts_dir> that mentions the filename of at least one
# fresh, non-empty image in the same directory. The markdown must also
# include the minimum verification fields agent-md asks for.
#
# This is deliberately opinionated — the agent must write prose about
# what it verified, not just drop a screenshot. A screenshot alone is
# a photo of something, not a verification claim.
visual_evidence_ok() {
  local dir="$1" fresh="$2"
  [ -d "$dir" ] || return 1
  local now
  now=$(date +%s)

  local md img img_name md_mtime img_mtime md_size img_size
  while IFS= read -r md; do
    [ -z "$md" ] && continue
    md_size=$(file_size "$md")
    [ "${md_size:-0}" -gt 0 ] || continue
    md_mtime=$(stat_mtime "$md")
    [ -z "$md_mtime" ] && continue
    [ $((now - md_mtime)) -le "$fresh" ] || continue
    grep -Eiq 'changed files?:' "$md" || continue
    grep -Eiq '(route|url):' "$md" || continue
    grep -Eiq 'viewport:' "$md" || continue
    grep -Eiq '(observed|result):' "$md" || continue

    while IFS= read -r img; do
      [ -z "$img" ] && continue
      img_size=$(file_size "$img")
      [ "${img_size:-0}" -gt 0 ] || continue
      img_mtime=$(stat_mtime "$img")
      [ -z "$img_mtime" ] && continue
      [ $((now - img_mtime)) -le "$fresh" ] || continue
      img_name=$(basename "$img")
      if grep -qF "$img_name" "$md" 2>/dev/null; then
        return 0
      fi
    done < <(find "$dir" -type f \( -name '*.png' -o -name '*.jpg' \
      -o -name '*.jpeg' -o -name '*.webp' -o -name '*.gif' \) 2>/dev/null)
  done < <(find "$dir" -type f -name '*.md' 2>/dev/null)

  return 1
}
