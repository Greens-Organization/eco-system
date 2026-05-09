# Mistakes Log

After any correction from the human, log the pattern here. Review at
session start before starting new work. The goal is to drive the error
rate toward zero.

Format:
- **Date** — *mistake* → **rule**

---

<!--
Examples:

- **2026-04-15** — Assumed `USER_ID` env var was set; silently fell back
  to empty string. → **Rule**: No silent fallbacks on env vars. Hard-fail
  at startup if required vars are missing.

- **2026-04-18** — Renamed `getUserPrefs` via grep; missed a dynamic
  import in `src/lib/legacy.ts`. → **Rule**: On every rename, search
  separately for static calls, type references, string literals, dynamic
  imports, re-exports, test mocks.
-->

---

## Personal seed (from CLAUDE.md v3)

Carried across every project. Patterns the upstream `agent-md` `CLAUDE.md` does
not cover identically.

### Treat your own output as a stranger would

When asked to test your own work, adopt a new-user persona. Walk through the
flow as if you've never seen the project. Models reading their own code tend to
fill in gaps they wouldn't fill in for someone else's work.

### Stop after two failed attempts

If a fix does not work twice in a row, stop. Re-read the entire relevant
section top-down. State explicitly where the mental model was wrong, then
adjust before trying again. Do not loop on "tweak one variable and retry."

### Raw error data only — never paraphrase

Bug fixes start from the actual stderr / log / stack trace. If a bug report
arrives without output attached, ask for it before guessing. Paraphrased errors
lose the line numbers, types, and stack frames that point to the real cause.

### Log corrections back into this file

When the human corrects an approach, append a one-line entry here describing
the *rule extracted*, not the specific incident. The goal is to convert a
mistake into a generalised rule for future sessions — and prevent reverting on
the next reset of context.

### When the human says "yes", "do it", or "push" — execute

Don't repeat the plan. Don't re-confirm. They've read it. Run.
