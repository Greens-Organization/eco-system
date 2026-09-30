# CLAUDE.md

Agent instructions for `eco-system` — a Bun + Turborepo monorepo: a Hono API
and a SvelteKit dashboard sharing versioned `@pack/*` packages.

This file describes **what is actually true today**, verified by running the
commands. When something here stops matching reality, fix this file in the same
commit that changed the behavior.

---

## 1. Layout

```
apps/api           Hono + Bun HTTP API, OpenAPI (zod) + Scalar, OTel
apps/dashboard     SvelteKit 2 / Svelte 5 admin dashboard
packages/*         @pack/* shared libraries
infra/docker       compose stacks: infra, observability, test
tasks/todo|done    task tracker
study/             reference material — not part of the build
```

`@pack/*`: `auth`, `cache`, `db`, `design-system`, `email`, `i18n`,
`observability`, `seo`, `storage`, `testing`, `tools`, `tsconfig`.

Each package keeps source under `src/`, exposes explicit subpath `exports`, and
reads its own runtime config from a per-package `pack-env.ts`.

---

## 2. Commands

```bash
bun install
bun run dev                  # turbo dev — api + dashboard
bun run build                # turbo build (note: build dependsOn test)
bun run test                 # turbo test
bun run lint                 # biome check ./
bun run format               # biome check --write ./
bunx turbo run typecheck     # no root alias; call turbo directly

bun run docker:infra:up      # postgres + redis
bun run docker:obs:up        # grafana/otel-lgtm

cd packages/db
bun run db:migrate           # drizzle-kit migrate
bun run db:seed              # creates ADMIN_EMAIL/ADMIN_PASSWORD user
bun run db:reset
bun run db:studio

cd apps/api
bun run test:e2e             # ephemeral compose, gated by E2E=1
```

Per-package: `typecheck` (`tsc --noEmit` in packages, `svelte-check` in the
dashboard). Only `api`, `@pack/observability`, `@pack/tools` and `@pack/testing`
define `test`.

**Broken script:** `apps/api` `docker:infra:up|down` points at
`apps/api/docker-compose.local.yml`, which does not exist. Use the root scripts.

---

## 3. Ports

| Port | Service |
| --- | --- |
| 3000 | dashboard (vite dev, `vite.config.ts`) |
| 3001 | Grafana (`docker-compose.observability.yml`, published off its native 3000) |
| 3002 | API (`apps/api/.env` → `PORT`) |
| 4317 / 4318 | OTLP gRPC / HTTP |
| 5432 | postgres |
| 6379 | redis |

---

## 4. Verification

There is **no CI and no verification hook**. Nothing runs automatically. Before
claiming work is done, run the checks yourself:

```bash
bunx turbo run typecheck --force   # 13/13 packages green
bunx biome check .                 # 5 known errors, see below
bunx turbo run test --force        # 55 pass / 0 fail
```

Turbo caches aggressively — pass `--force` when you need a real signal, or a
green run may just be a replay.

Known lint failures (pre-existing, not caused by your change):

- `packages/db/schema/User/{Account,Session,User,Verification}.ts` —
  `useFilenamingConvention` wants kebab-case. Only 6 references, all inside
  `@pack/db`.
- `apps/dashboard/static/favicon.svg` — `noSvgWithoutTitle` firing on a static
  asset. Fix with a `biome.json` override, not by editing the favicon.

Do not claim completion from inspection alone. For UI work, render the page and
look at it. For behavior changes, exercise the endpoint or route.

---

## 5. Conventions

- **Versions** live in the root `package.json` `catalog` / `catalogs.dev`.
  Reference them as `"catalog:"` — never pin a version inside a package.
  All versions are exact (no `^`), so `bun update` is a no-op by design.
- **Runtime config** is a per-package `pack-env.ts` with a zod schema. Invalid
  env fails loudly at startup; no silent fallbacks.
- **No silent fallbacks** generally — invalid state should throw, not degrade.
- **Comments** only where the reason is not obvious from the code.
- Match the surrounding style before introducing a new pattern.

### API

- Routes live in `apps/api/src/main/routes/v1/<name>/` as
  `schema.ts` + `get.ts` + `index.ts`, registered on the v1 router with an
  OpenAPI tag.
- Errors go through `AppError` and the central handler in
  `main/infra/error-handler.ts`.
- `v1.use('/*', authMiddleware)` protects every v1 route. Hono applies
  middleware in registration order, so `/v1/openapi` and the Scalar UI —
  registered earlier — stay public by design.

### Dashboard

- Routes are `[locale]/(authenticated)/…` and `[locale]/(unauthenticated)/…`.
  Route groups do not appear in the URL: the panel is `/{locale}`, not
  `/dashboard`. Locales: `en` (default), `pt`, `es`.
- `hooks.server.ts` composes `logHandle → authHandle → localeHandle →
  sessionHandle → i18nHandle`, and redirects unauthenticated requests to
  `/{locale}/sign-in`.
- Server loads fetch the API through `createApiClient(cookieHeader, requestId)`
  and validate every response with `safeFetch` + a zod schema. A `401` clears
  the `better-auth.*` cookies and redirects to sign-in.

### Auth

`better-auth` with email/password and argon2 (`@pack/tools`), Drizzle adapter,
5-minute session cookie cache. The API mounts it at `/auth`.

When forwarding `Set-Cookie` from the API to the browser, keep
`encode: v => v` — SvelteKit's default `encodeURIComponent` re-encodes
better-auth's base64 payload and breaks HMAC verification on the next request.

### Load-bearing oddities

Things that look like leftovers or cleanup targets but are deliberate. Each was
measured or debugged; changing one regresses something.

- **`vite.config.ts` `optimizeDeps.include`** — the transitive deps use the
  nested `@pack/design-system > dep` form because Bun's isolated linker does not
  resolve them as bare entries from the dashboard root. The `*/icons/*` globs
  stay: dropping them regressed cold render from ~19s to ~33s in testing.
- **`ssr.noExternal: ['lucide-svelte']` is gated to `command === 'build'`** — in
  dev, externalizing is what keeps SSR cold-start fast.
- **`ssr.external: ['pino', 'pino-pretty', 'thread-stream']`** — pino resolves
  its worker-thread transport via `__dirname`; bundling it breaks at runtime.
- **`prepare: true` in `packages/db/index.ts`** — correct for the long-running
  API. Revert to `false` behind PgBouncer transaction mode, the Supabase pooler,
  or serverless.
- **No `[Symbol.asyncDispose]` on the `db` / `cache` singletons** — a consumer's
  `await using` would close the shared pool for everyone. `disconnectDatabase()`
  and `disconnectCache()` are the teardown path for a global singleton.
- **`apps/api/test/e2e/setup.ts` assigns `DATABASE_URL` with `=`, not `||=`** —
  Bun auto-loads `packages/db/.env`, so the override must be unconditional or
  e2e points at the dev database. The `eco_test` check in `runMigrations()` is
  defense-in-depth, not the primary guard.
- **OTel is initialized programmatically**, never via `--require`/preload —
  auto-instrumentation is flaky on Bun.
- **`@pack/seo` ships only `json-ld`** — the Next-shaped `metadata.ts` was
  removed deliberately. The package has no importers by design; it is a helper
  for whoever forks the template.
- **`@pack/email` takes an HTML string, not a component** — the react-email
  templates were removed in 2026-09 so no React remains in the monorepo.
  Templating is the caller's choice; `sendEmailHtml` and `sendBatchEmailHtml`
  only do SMTP over nodemailer, and both no-op unless `NODE_ENV` is
  `production` or `development`.

---

## 6. Observability

Everything is **default-off**: no `SENTRY_DSN` → Sentry is a no-op; no
`OTEL_EXPORTER_OTLP_ENDPOINT` → no export.

### Log contract (3 layers)

pino JSON, composed in `@pack/observability/logger`:

1. **Per process** (`base`): `service`, `environment`, `instance`, `version`,
   `region?`.
2. **Per request** (AsyncLocalStorage `mixin` → `getContext()`): `request_id`,
   `support_id`, `cf_ray_id?`, `route`, `method`, `status_code`, `duration_ms`,
   `ip`, `user_agent`, plus business fields added via `setContext()`. The API's
   `middleware/observability.ts` opens the scope per request. `/status`,
   `/ready` and `/health` are not access-logged.
3. **Per event** (`AppError`): `error_code`, `classification`,
   `eventCategory?`, `userMessage?`.

`trace_id` / `span_id` are injected from the active OTel span, so logs correlate
with traces automatically.

> The pino-pretty transport deliberately surfaces `requestId` / `path` (and
> `request_id` / `route`). The dashboard's `hooks.server.ts` bridges live logs
> through these fields — **do not remove them.**

### Classification → Sentry

| Classification | Routing |
| --- | --- |
| `business_error` | log only |
| `validation_error` | log only |
| `technical_error` | log + Sentry |
| `critical_incident` | log + Sentry |

`defaultClassification(status)` derives it when unset: 400/422 →
`validation_error`, ≥500 → `technical_error`, else `business_error`. Sentry tags
carry `support_id`, `error_code`, `classification`; `extra` is PII-allowlisted
(`sentry/scrub`).

`generateSupportId()` → `SUP-` + 12 uppercase hex. Set once per request,
returned to the client, sent to Sentry as a tag.

### Health split

- `/status` — liveness, always `{ status: 'ok' }`. Use for the container
  healthcheck and `livenessProbe`.
- `/ready` — readiness: checks the DB and the shutdown flag, returns `503`
  (`not_ready` / `shutting_down`). Use for `readinessProbe`.

### Telemetry topology

Sentry handles **errors only**. OpenTelemetry owns **traces + metrics** and
exports via OTLP to Grafana through an independent `NodeTracerProvider` /
`MeterProvider` (`instrumentation.ts`). HTTP spans come from `@hono/otel`, not
require-hook auto-instrumentation, so Bun import order is not fragile.

> `BatchSpanProcessor` is fire-and-forget: if the OTLP endpoint is down it drops
> spans silently. The app side is proven once `trace_id` appears in the access
> log; verify the collector side in Grafana.

### Sampling

Head sampling only, via the standard env vars (verified:
`OTEL_TRACES_SAMPLER=always_off` exports zero traces and the app still logs
`trace_id`):

- Unset → `parentbased_always_on` (keep 100%). Correct at current volume.
- Prod → `OTEL_TRACES_SAMPLER=parentbased_traceidratio` +
  `OTEL_TRACES_SAMPLER_ARG=0.1`. Parent-based keeps a trace whole across
  services.

Content-aware ("keep all errors + slow traces") is **tail sampling** and belongs
in a Collector, not the SDK — the SDK decides at the root span, before the trace
exists. The bundled `otel-lgtm` collector is a fixed forward pipeline and cannot
do it. Full strategy: `tasks/todo/sampling-strategy.md`.

---

## 7. Working agreements

- The owner makes architectural, business-logic and product decisions. Name
  ambiguities and ask instead of guessing.
- Follow a written plan step by step when given one. Flag blockers; don't
  redesign silently.
- Keep changes to one vertical slice at a time. Don't mix broad refactors into
  feature work.
- Re-read a file before editing it. On renames or signature changes, search
  separately for direct calls, type references, string literals, dynamic
  imports, `require()`, re-exports, barrel files and test mocks.
- Never push to a shared remote unless explicitly asked.
- Work from raw command output, not from memory of what it probably said.

---

## 8. Current state

Branch `alpha/eco-system-v2`, 87 commits ahead of `main`, no upstream.

Open work, largest first:

1. **No CI.** `.github/` has templates only. 55 tests exist and nothing runs
   them.
2. **Test coverage is concentrated** in 4 of 14 packages. The dashboard has no
   tests.
3. **60 outdated dependencies** and a toolchain mismatch (`.tool-versions` bun
   1.3.13 vs `packageManager` bun 1.3.14). See
   `tasks/todo/health-and-upgrade-audit.md`.
4. **`tasks/todo/`** — `observability-followups.md` (F3 DB spans, F7 dashboard
   observability + k8s) is live; `boilerplate-gaps-audit.md` is stale and
   overstates what is missing; `i18n-paraglide-migration.md` is deliberately
   parked; `sampling-strategy.md` is reference, not a task.
