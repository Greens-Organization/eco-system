#!/bin/bash
# discover_helpers.sh — list/search agent-md helper scripts
# Usage:
#   ./.agent-md/bin/discover_helpers.sh           # list helpers
#   ./.agent-md/bin/discover_helpers.sh <query>   # search helpers
#
# These helpers are plain shell scripts, not Codex skills.

QUERY="${1:-}"
DIR="$(dirname "$0")"

if [ -z "$QUERY" ]; then
  echo "Available agent-md helpers in $DIR/:"
  echo ""
  for SCRIPT in "$DIR"/*.sh "$DIR"/*.md; do
    [ -f "$SCRIPT" ] || continue
    NAME=$(basename "$SCRIPT")
    [ "$NAME" = "discover_helpers.sh" ] && continue
    [ "$NAME" = "README.md" ] && continue
    DESC=$(head -5 "$SCRIPT" | grep -E '^(#|<!--)' | head -1 | sed -E 's/^(#!\/bin\/bash|#\s*|<!--\s*|-->)//g')
    echo "  • $NAME"
    [ -n "$DESC" ] && echo "    $DESC"
  done
  echo ""
  echo "Run: ./.agent-md/bin/discover_helpers.sh <query>  to search by keyword."
  exit 0
fi

MATCHES=$(grep -il "$QUERY" "$DIR"/*.sh "$DIR"/*.md 2>/dev/null | grep -v discover_helpers.sh)

if [ -z "$MATCHES" ]; then
  echo "No helpers match '$QUERY'."
  echo "Run ./.agent-md/bin/discover_helpers.sh (no args) to list all."
  exit 0
fi

for MATCH in $MATCHES; do
  echo "=== $(basename "$MATCH") ==="
  head -25 "$MATCH"
  echo ""
done
