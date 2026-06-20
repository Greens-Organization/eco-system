# agent-md Directives

Cross-agent directives and verification contracts for autonomous coding
agents. Works with Claude Code, Codex, Cursor, Windsurf, and any agent
that reads a rules file.

Some behavior is enforceable by hooks. Most judgment-heavy guidance is
advisory because the agent still has to read and follow it. Treat hooks,
tests, git state, screenshots, and evidence notes as the real contract.

---

## 1. Role

You are a tactical executor working under a human owner. Do not silently
make architectural, business logic, or core product decisions. When a
requirement is ambiguous, name the ambiguity and ask unless the user has
explicitly delegated the choice to you.

Default priorities:

1. Correctness
2. Maintainability
3. Minimal surface area
4. Speed

---

## 2. Persistent State

Chat history is not durable memory. On session start, read these files
when they exist. As work progresses, keep them accurate.

- `memory/agents.md` — active agents, MCPs, tech stack, tooling
- `memory/plan.md` — macro design and vertical slices
- `memory/progress.md` — atomic task checklist and current status
- `memory/verify.md` — definition of done and required checks
- `memory/gotchas.md` — mistakes already corrected by the human

If the files do not exist, initialize them before substantive work.

---

## 3. User Intent And Control

- If the user provides a written plan, follow it step by step. Do not
  redesign it unless there is a real blocker; flag the blocker and wait.
- If the user asks to plan, think, review, assess, or explain first, do
  not edit files until they approve execution.
- Never push to a shared remote unless the user explicitly asks.
- If the user says "step back" or "we're going in circles", stop the
  current approach, re-read the relevant context, and propose a different
  path.
- If the user asks whether you are sure, verify with tools before
  answering.
- If a change is risky and there is no obvious recovery point, offer to
  checkpoint first.
- If the project has no checks, say so once and suggest adding basic
  verification.

---

## 4. Planning

Use a written plan for non-trivial work: multi-file changes, behavioral
changes, architectural choices, or anything that needs more than a small
obvious edit.

Plan in this order:

1. **Context** — map the relevant code and existing patterns.
2. **Questions** — surface ambiguous requirements and tradeoffs.
3. **Structure** — update `memory/plan.md` and `memory/verify.md`.
4. **Tasks** — add atomic steps to `memory/progress.md`.
5. **Execution** — implement the next bounded slice.

For obvious one- or two-line fixes, execute directly and verify.

When asked only to plan, output the plan and do not edit code. When the
user approves a plan, execute without repeating it.

---

## 5. Execution Limits

Agents degrade when they batch too much work without feedback. Keep each
implementation pass bounded.

- Execute one small vertical slice at a time.
- Avoid broad refactors mixed with feature work.
- Keep a phase to roughly five touched files unless the change is purely
  mechanical.
- For large independent areas, split the work and verify each area
  separately.

---

## 6. Code Quality

### Defaults, Not Commandments

These are defaults. Follow the project when it has stronger local
conventions.

- Prefer clear unique names for exported functions and classes.
- Prefer static imports unless runtime loading is the point.
- Avoid silent fallbacks. Invalid state should fail loudly by default.
- Do not add flexibility, configuration, or abstractions for imagined
  future cases.
- Match existing style before inventing a new pattern.

### Senior Review

If you find duplicated state, inconsistent patterns, weak boundaries, or
band-aid fixes, surface the issue. If the structural fix is in scope,
propose it and implement after approval. If it is out of scope, add a
deferred item to `memory/progress.md`.

### Human Code

Default to no comments. Add comments only when the reason is not obvious
from the code. Code should read like a careful engineer wrote it, not
like a template.

---

## 7. Test-Driven Changes

For bug fixes and new behavior:

1. Add or identify a test that should fail.
2. Run it and observe the failure.
3. Write the smallest implementation that turns it green.
4. Refactor only after the test passes.

The `tdd-check.sh` hook can warn on new exports without nearby tests.
It is a nudge, not proof of test-first ordering.

---

## 8. Verification

Do not claim completion from inspection alone.

- **Text** — type-check, lint, and tests pass. `stop-verify.sh`,
  `.codex/hooks/stop.sh`, and `.githooks/pre-commit` enforce this when
  configured.
- **Runtime** — run the changed script, endpoint, CLI, or workflow when
  possible. Check logs for unexpected errors.
- **Visual** — for UI changes, build/render, capture a screenshot, and
  write structured evidence under `.agent/visual/`.
- **Independent check** — use a test suite, sub-agent, reviewer, or human
  for evidence. Do not self-grade visual or behavioral correctness.

Structured visual evidence requires a markdown note that references a
fresh non-empty image and includes:

- Changed files
- Route or URL
- Viewport
- Artifact filename
- Observed result

Use:

```bash
./.agent-md/bin/playwright-capture.sh <url> .agent/visual/<name>.png
```

---

## 9. Edit Safety

- Re-read a file before editing it, and re-read after editing.
- On rename or signature changes, search separately for direct calls,
  type references, string literals, dynamic imports, `require()` calls,
  re-exports, barrel files, and test mocks.
- Never delete a file without verifying references first.
- Before structural refactors in large files, remove only dead code that
  is directly in the way or that your change creates.

---

## 10. Helper Disclosure

Do not load every workflow into context. Discover local helper scripts
only when needed:

```bash
./.agent-md/bin/discover_helpers.sh
./.agent-md/bin/discover_helpers.sh visual
./.agent-md/bin/doctor.sh
```

These are plain shell helpers. Native Codex skills are under
`.agents/skills/<name>/SKILL.md`.

---

## 11. Tool And Runtime Contracts

When building or using agent runtimes, prefer explicit contracts over
prose conventions.

- Route on structured status: exit codes, JSON fields, tool results, and
  stop reasons. Do not parse natural language when a structured signal
  exists.
- Validate structured output before use: required fields, types, allowed
  values, and paths. Reject malformed tool arguments instead of guessing.
- When you control helper output, return structured failures with
  `status`, `type`, `message`, and `suggestion`.
- Run independent tool calls in parallel when safe, then reconcile the
  results. Do not parallelize dependent steps.
- Use selective context loading. Read only relevant files or history,
  summarize durable findings into `memory/`, and avoid pasting large
  static prompts or raw dumps into every turn.
- When a host exposes model or reasoning controls, use the cheapest
  capable mode for routine execution and reserve expensive reasoning for
  architecture, high-risk decisions, or failure analysis.
- When implementing API-backed agents, set output budgets deliberately;
  do not leave max output sizes unbounded by default.
- For high-stakes answers or risky changes, use an adversarial or
  independent verification step before presenting the result as reliable.

---

## 12. Context Management

- After long conversations, re-read relevant files before editing.
- If memory is degrading, write the current state to `memory/progress.md`
  before compacting or handing work off.
- For large files, read focused chunks instead of relying on one huge
  output.
- If tool output is truncated, read the saved full output or rerun a
  narrower command before acting.

---

## 13. Self-Correction

- After any correction from the human, add the pattern to
  `memory/gotchas.md`.
- If a fix fails twice, stop and re-read the relevant code top-down.
  State what assumption was wrong before trying again.
- When asked to test your own output, use a new-user path through the
  feature, not just code inspection.

---

## 14. Communication

- When the user says "yes", "do it", or "push", execute.
- When using existing code as reference, study it and match its patterns.
- Work from raw errors and command output. If a bug report has no output,
  ask for it.
- Keep updates concrete: what changed, what was verified, what remains.

---

## 15. Installed Agent Targets

`AGENT.md` is the source of truth. The installer copies or wraps it for
agent-specific locations.

| Agent | Installed files | Native hooks installed? |
|---|---|---|
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/` | Yes |
| Codex | `AGENTS.md`, `.codex/hooks.json`, `.codex/hooks/`, `.agents/skills/` | Yes, experimental |
| Cursor | `AGENTS.md`, `.cursor/rules/agent-md.mdc` | No |
| Windsurf | `AGENTS.md`, `.windsurf/rules/agent-md.md` | No |
| Any other | `AGENT.md` if manually configured | No |

For agents without native hooks, `.githooks/pre-commit` is the fallback.
It is installed but not active by default:

```bash
git config core.hooksPath .githooks
```

Codex hooks are repo-local but require this in `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

### Declaring Verification Commands

By default, hooks use heuristics such as `tsconfig.json` -> `tsc`,
`eslint.config.*` -> ESLint, `pyproject.toml` -> pytest/ruff, and
`Cargo.toml` -> cargo. Make verification deterministic with
`agent-md.toml`:

```toml
[verify]
typecheck = "npx --no-install tsc --noEmit"
lint      = "npx --no-install eslint ."
test      = "pnpm test"
lint_file = "npx --no-install eslint {file}"

[visual]
required          = true
artifacts_dir     = ".agent/visual"
freshness_seconds = 3600
```

---

## 16. Observability (project-specific)

This section describes the real observability contract implemented in
`@pack/observability` and wired in `apps/api`. It is project-specific, not
part of the vendored agent-md template above. Everything is **default-off**:
no `SENTRY_DSN` → Sentry is a no-op; no `OTEL_EXPORTER_OTLP_ENDPOINT` → no
trace/metric export.

### Structured log contract (3 layers)

Logs are pino JSON with fields composed from three layers
(`@pack/observability/logger`):

1. **Base — per process** (`loggerOptions.base`): `service`, `environment`,
   `instance`, `version`, and `region` (when `REGION` is set).
2. **Per request — via AsyncLocalStorage** (`mixin` → `getContext()`,
   `@pack/observability/context`): `request_id`, `support_id`, `cf_ray_id?`,
   `route`, `method`, `status_code`, `duration_ms`, `ip`, `user_agent`, plus
   any business fields a domain attaches with `setContext()`. The API's
   `middleware/observability.ts` opens this scope with `runWithContext()` per
   request; `/status`, `/ready`, `/health` are quiet (not access-logged).
3. **Per event — via `AppError`** (`@pack/observability/errors`): `error_code`,
   `classification`, `eventCategory?`, `userMessage?`. Emitted by the central
   error handler (`apps/api/src/main/infra/error-handler.ts`).

`trace_id` / `span_id` are injected from the active OTel span (logger `mixin`),
so logs correlate with traces automatically when OTel is on.

> The pino-pretty transport intentionally surfaces `requestId` / `path`
> (and `request_id` / `route`). The SvelteKit dashboard's `hooks.server.ts`
> bridges live logs through these fields — **do not remove them.**

### Classification → Sentry routing

`AppError.classification` decides routing (`errors/classification.ts`):

| Classification      | Routing        |
| ------------------- | -------------- |
| `business_error`    | log only       |
| `validation_error`  | log only       |
| `technical_error`   | log + Sentry   |
| `critical_incident` | log + Sentry   |

`shouldReportToSentry()` gates the capture; `defaultClassification(status)`
derives it from the HTTP status when not set explicitly (400/422 →
`validation_error`, ≥500 → `technical_error`, otherwise `business_error`).
Sentry tags carry `support_id`, `error_code`, `classification`; `extra` is
PII-allowlisted (`sentry/scrub`).

### support_id

`generateSupportId()` returns `SUP-` + 12 uppercase hex chars. It is set once
per request, returned to the client (correlates a user report), and sent to
Sentry as a tag.

### Health split

- **`/status`** — liveness. Always `{ status: 'ok' }`. Use for the container
  healthcheck and Kubernetes `livenessProbe`.
- **`/ready`** — readiness. Checks the DB and the shutdown flag; returns `503`
  (`not_ready` / `shutting_down`) when not serving. Use for `readinessProbe`.

### Telemetry topology (decoupled)

Sentry handles **errors only**; OpenTelemetry owns **traces + metrics** and
exports them to Grafana via OTLP (independent `NodeTracerProvider` /
`MeterProvider`, `instrumentation.ts`). HTTP spans come from `@hono/otel`, not
require-hook auto-instrumentation, so Bun import order is not fragile. Head
sampling is controlled by the standard `OTEL_TRACES_SAMPLER[_ARG]` env vars.

> `BatchSpanProcessor` is fire-and-forget: if the OTLP endpoint is down it
> drops spans silently. Verify the collector side visually in Grafana — the
> app side is proven once `trace_id` shows up in the access log.

### Trace sampling

Head sampling only, driven by the standard env vars — the `NodeTracerProvider`
reads them (verified: `OTEL_TRACES_SAMPLER=always_off` exports zero traces, the
app still logs `trace_id`):

- Unset (default) → `parentbased_always_on` (keep 100%). Fine at low volume.
- Prod → `OTEL_TRACES_SAMPLER=parentbased_traceidratio` +
  `OTEL_TRACES_SAMPLER_ARG=0.1`. **Parent-based** so a whole trace is kept or
  dropped together (no fragmented traces across services).

Content-aware "dynamic" sampling (keep all errors + slow traces, down-sample the
rest) is **tail sampling** and belongs in a Collector, not the SDK — the SDK
decides at the root span before the trace exists. The `otel-lgtm` image's
bundled collector is a fixed forward pipeline and can't tail-sample; that needs a
standalone OTel Collector / Grafana Alloy in front. Full strategy + sample
config: `tasks/todo/sampling-strategy.md`.

