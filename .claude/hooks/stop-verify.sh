#!/bin/bash
# stop-verify.sh
# Runs when Claude tries to finish a task (Stop event).
# The agent cannot declare "Done!" until the project actually compiles,
# lints, and passes tests.
#
# Hook output contract (Claude Code):
#   exit 0 + JSON on stdout → Claude reads the structured decision.
#   We emit {decision:"block", reason:...} on stdout with exit 0.
#
# Design choice — no retry release:
#   Earlier versions broke out after N consecutive failing retries to
#   avoid trapping the agent in a loop. That escape hatch meant
#   "enforcement" was conditional on the agent's persistence — not
#   enforcement at all. We keep blocking until the commands actually
#   pass. `stop_hook_active=true` does NOT short-circuit us; if the
#   agent retries without fixing anything, we block again.
#
#   The only way out is to fix the failing command — or delete the
#   offending entry in agent-md.toml [verify] and accept an unverified
#   Stop.
#
# Configuration:
#   agent-md.toml [verify] typecheck / lint / test override heuristics.
#   Package-manager detection for `test` is shared with .githooks/pre-commit
#   via npm_test_cmd() in _lib.sh so the two never disagree.

# shellcheck source=.claude/hooks/_lib.sh
. "$(dirname "$0")/_lib.sh"

# Read and discard stdin — Claude sends JSON but we don't branch on it.
cat > /dev/null

TOML=$(toml_path)
CFG_TYPECHECK=$(read_toml "$TOML" verify typecheck)
CFG_LINT=$(read_toml "$TOML" verify lint)
CFG_TEST=$(read_toml "$TOML" verify test)

ERRORS=""
CHECKS_RUN=0

run_check() {
  local label="$1" cmd="$2"
  [ -n "$cmd" ] || return 0
  CHECKS_RUN=$((CHECKS_RUN + 1))
  local OUT
  OUT=$(eval "$cmd" 2>&1)
  # shellcheck disable=SC2181
  if [ $? -ne 0 ]; then
    ERRORS="${ERRORS}${label} FAILED:
$(echo "$OUT" | compact_errors 12)

"
  fi
}

# --- Typecheck ---
if [ -n "$CFG_TYPECHECK" ]; then
  run_check "TYPECHECK ($CFG_TYPECHECK)" "$CFG_TYPECHECK"
elif [ -f "tsconfig.json" ]; then
  run_check "TSC --noEmit" "npx --no-install tsc --noEmit"
fi

# --- Lint ---
if [ -n "$CFG_LINT" ]; then
  run_check "LINT ($CFG_LINT)" "$CFG_LINT"
else
  if compgen -G ".eslintrc*" > /dev/null || compgen -G "eslint.config.*" > /dev/null; then
    run_check "ESLINT" "npx --no-install eslint ."
  fi
  if command -v ruff &>/dev/null && compgen -G "*.py" > /dev/null; then
    run_check "RUFF" "ruff check ."
  fi
fi

# --- Python mypy (heuristic, not covered by a single CFG slot) ---
if [ -z "$CFG_TYPECHECK" ] && command -v mypy &>/dev/null \
   && { [ -f "mypy.ini" ] || grep -q '\[tool.mypy\]' pyproject.toml 2>/dev/null; }; then
  run_check "MYPY" "mypy ."
fi

# --- Rust ---
if [ -z "$CFG_TYPECHECK" ] && [ -f "Cargo.toml" ]; then
  run_check "CARGO CHECK" "cargo check"
fi

# --- Tests ---
if [ -n "$CFG_TEST" ]; then
  run_check "TESTS ($CFG_TEST)" "$CFG_TEST"
else
  NPM_TEST=$(npm_test_cmd)
  if [ -n "$NPM_TEST" ] && has_npm_test_script; then
    run_check "NPM TEST" "$NPM_TEST"
  elif { [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; } && command -v pytest &>/dev/null; then
    run_check "PYTEST" "pytest --tb=short -q"
  elif [ -f "Cargo.toml" ]; then
    run_check "CARGO TEST" "cargo test"
  fi
fi

# --- Report ---
if [ -n "$ERRORS" ]; then
  SUMMARY=$(printf 'Verification failed (%d checks ran). Fix these errors before completing:\n\n%s' \
    "$CHECKS_RUN" "$ERRORS")
  jq -n --arg r "$SUMMARY" '{decision: "block", reason: $r}'
  exit 0
fi

if [ "$CHECKS_RUN" -eq 0 ]; then
  jq -n '{systemMessage: "No type-checker, linter, or test suite detected. Task completion is unverified. State this to the user, or add an agent-md.toml to declare verification commands."}'
  exit 0
fi

exit 0
