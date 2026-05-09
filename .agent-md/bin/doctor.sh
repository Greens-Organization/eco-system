#!/bin/bash
# doctor.sh — check an agent-md installation for common wiring problems
# Usage: ./.agent-md/bin/doctor.sh

set -u

FAIL=0

ok() { printf 'ok  %s\n' "$*"; }
warn() { printf 'warn %s\n' "$*"; }
bad() { printf 'bad %s\n' "$*"; FAIL=1; }

have() {
  command -v "$1" >/dev/null 2>&1
}

have git || bad "git is not installed"
have jq || bad "jq is not installed; hooks need it for JSON parsing"
have bash || bad "bash is not installed"

if [ -f AGENT.md ]; then
  ok "AGENT.md exists"
else
  bad "AGENT.md missing"
fi

if [ -f AGENT.md ] && [ -f CLAUDE.md ]; then
  if cmp -s AGENT.md CLAUDE.md; then
    ok "CLAUDE.md matches AGENT.md"
  else
    bad "CLAUDE.md drifted from AGENT.md"
  fi
fi

if [ -f AGENTS.md ]; then ok "AGENTS.md exists"; else warn "AGENTS.md missing"; fi
if [ -f .claude/settings.json ]; then ok "Claude settings present"; else warn "Claude settings missing"; fi
if [ -f .codex/hooks.json ]; then ok "Codex hooks present"; else warn "Codex hooks missing"; fi
if [ -d .agent-md/bin ]; then ok "agent-md helpers present"; else warn ".agent-md/bin missing"; fi
if [ -d memory ]; then ok "memory directory present"; else warn "memory directory missing"; fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HOOKS_PATH=$(git config --get core.hooksPath || true)
  if [ "$HOOKS_PATH" = ".githooks" ]; then
    ok "git hook fallback is active"
  elif [ -f .githooks/pre-commit ]; then
    warn "git hook fallback installed but not active"
  fi
else
  warn "not inside a git worktree"
fi

if [ "$FAIL" -eq 0 ]; then
  ok "agent-md doctor finished"
else
  bad "agent-md doctor found problems"
fi

exit "$FAIL"
