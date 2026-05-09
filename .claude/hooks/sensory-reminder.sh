#!/bin/bash
# sensory-reminder.sh
# Stop hook for UI changes.
#
# Two modes, chosen via agent-md.toml:
#
#   [visual] required = false   (default)  → advisory reminder only.
#                                            Emits additionalContext
#                                            suggesting screenshot+VLM.
#
#   [visual] required = true               → blocking. Stop is denied
#                                            unless STRUCTURED evidence
#                                            exists under artifacts_dir:
#                                            a fresh markdown note that
#                                            references a fresh image by
#                                            filename. A lone screenshot
#                                            is NOT a verification claim
#                                            — the prose is the claim.
#
# No stop_hook_active bypass. A retry does not manufacture evidence.
# The only way out is to produce the artifact — or flip required=false.

# shellcheck source=.claude/hooks/_lib.sh
. "$(dirname "$0")/_lib.sh"

# Read and discard stdin.
cat > /dev/null

git rev-parse --is-inside-work-tree &>/dev/null || exit 0

UI_PATTERN='\.(tsx|jsx|vue|svelte|astro|css|scss|sass|html)$'
UI_CHANGED=$(
  {
    git diff --name-only 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | grep -cE "$UI_PATTERN"
)
UI_CHANGED=${UI_CHANGED:-0}

if [ "$UI_CHANGED" -eq 0 ]; then
  exit 0
fi

TOML=$(toml_path)
REQUIRED=$(read_toml "$TOML" visual required)
ART_DIR=$(read_toml "$TOML" visual artifacts_dir)
FRESH=$(read_toml "$TOML" visual freshness_seconds)
ART_DIR="${ART_DIR:-.agent/visual}"
FRESH="${FRESH:-3600}"

if [ "$REQUIRED" = "true" ]; then
  if visual_evidence_ok "$ART_DIR" "$FRESH"; then
    MSG="Visual validation: structured evidence found in ${ART_DIR} (markdown note + referenced image, both fresh). Confirm to the user which UI diff the evidence validates."
    jq -n --arg m "$MSG" '{systemMessage: $m}'
    exit 0
  fi

  REASON="Visual validation required. ${UI_CHANGED} UI file(s) changed. ${ART_DIR} must contain a fresh non-empty markdown evidence file that references a fresh non-empty image by filename. Required markdown fields: Changed files, Route or URL, Viewport, Artifact, Observed result. Capture the screenshot (see ./.agent-md/bin/playwright-capture.sh), write the note next to it, retry. A screenshot alone is not verification."
  jq -n --arg r "$REASON" '{decision: "block", reason: $r}'
  exit 0
fi

# Reminder mode (default, advisory)
MSG="UI files changed (${UI_CHANGED}). Before marking complete: (1) build and render the change, (2) capture a screenshot (see ./.agent-md/bin/playwright-capture.sh), (3) write a markdown note next to it that references the image filename and records Changed files, Route or URL, Viewport, Artifact, and Observed result, (4) have it reviewed by an independent verifier. Do not self-grade. (Set [visual] required = true in agent-md.toml to turn this into a hard block.)"
jq -n --arg m "$MSG" '{systemMessage: $m}'
exit 0
