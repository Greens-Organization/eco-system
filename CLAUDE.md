# CLAUDE.md

Agent instructions for `eco-system` — a Bun + Turborepo monorepo: a Hono API
and a SvelteKit dashboard sharing versioned `@pack/*` packages.

This file describes **what is actually true today**, verified by running the
commands. When something here stops matching reality, fix this file in the same
commit that changed the behavior.

---

## 1. Layout

```
apps/dashboard-api Hono + Bun HTTP API, OpenAPI (zod) + Scalar, OTel
apps/dashboard     SvelteKit 2 / Svelte 5 admin dashboard
packages/*         @pack/* shared libraries
infra/docker       compose stacks: infra, observability, test
tasks/todo|done    task tracker
study/             reference material — not part of the build
```

`@pack/*`: `auth`, `cache`, `db`, `design-system`, `email`, `i18n`,
`observability`, `seo`, `storage`, `testing`, `tools`, `tsconfig`.

Each package keeps source under `src/` (except `design-system`, which uses
`components/`, `hooks/`, `lib/`, `styles/`, and `tsconfig`, which is config
only), exposes explicit subpath `exports`, and reads its own runtime config
from a per-package `pack-env.ts`.

---

## 2. Commands

```bash
bun install
bun run setup                # install + infra up (--wait) + db:migrate + db:seed
bun run dev                  # turbo dev — api + dashboard
bun run build                # turbo build (note: build dependsOn test)
bun run test                 # turbo test
bun check                    # TypeScript type check (Bun's built-in checker)
bun run check:svelte         # svelte-check in the dashboard and design-system
bun run lint                 # biome check ./
bun run format               # biome check --write ./
bun run verify               # lint, bun check, then turbo check:svelte + build (build runs test)

bun run docker:infra:up      # postgres + redis, waits for healthchecks
bun run docker:obs:up        # grafana/otel-lgtm

bun run db:generate          # these fan out to @pack/db via bun --filter
bun run db:migrate           # drizzle-kit migrate
bun run db:seed              # creates the ADMIN_EMAIL/ADMIN_PASSWORD user (8+ chars, no default)
bun run db:reset             # wipes every table; refused unless DATABASE_URL is localhost
bun run db:studio

bun run test:e2e             # API e2e on an ephemeral compose, gated by E2E=1
```

Type checking is split by file type, because `bun check` does not read
`.svelte` files:

- **`bun check`** (Bun ≥ 1.4.3, a port of typescript-go that behaves like
  TypeScript 7) checks the 11 TS-only workspaces through the root
  `tsconfig.json`, which has `"files": []` and one `references` entry per
  workspace. **A new TS workspace must be added there** or it goes unchecked.
  Inside a single workspace, `bun check` checks just that one.
- **`check:svelte`** (`svelte-check`) covers `apps/dashboard` and
  `@pack/design-system`. Pointed at those two, `bun check` either passes
  without looking at the `.svelte` files or fails on component exports, so
  they stay out of the root references.

There is deliberately no root script named `check`: a `check` script shadows
the built-in `bun check`. The aggregate gate is `verify`.

The `typescript` package (6.0.3, root devDependency) is only for
`svelte-check` and the editor. `bun check` matches TypeScript 7.0.2
(`bun -p process.versions.typescript`), so the editor can in rare cases
disagree with it; aligning the two is part of the dependency majors (H1).

`@app/dashboard-api`, `@app/dashboard-svelte`, `@pack/auth`, `@pack/db`,
`@pack/observability`, `@pack/tools`, `@pack/testing`, `@pack/email` and
`@pack/seo` define `test`. The
dashboard's run under plain `bun test` (no Vite), so they cover `src/lib`
modules that do not import `$env`/`$app`; keep server logic there
(`src/lib/server/*`) and inject what touches the network.

`drizzle-kit` must run under Bun (`bun x --bun`, as the `@pack/db` scripts do):
the schema imports `bun`, so a bare `bunx drizzle-kit` fails to resolve it.

---

## 3. Ports

| Port | Service |
| --- | --- |
| 3000 | dashboard (vite dev, `vite.config.ts`) |
| 3001 | Grafana (`docker-compose.observability.yml`, published off its native 3000) |
| 3002 | API (`apps/dashboard-api/.env` → `PORT`) |
| 4317 / 4318 | OTLP gRPC / HTTP |
| 5432 | postgres |
| 6379 | redis |
| 5436 / 6380 | e2e postgres / redis (`docker-compose.test.yml`) |

---

## 4. Verification

`.github/workflows/ci.yml` runs `biome ci`, `bun check`, `turbo check:svelte
build` (`build` depends on `test`) and the API
e2e suite on pull requests and on pushes to `main`, with bun/node from
`mise.toml`. It has not run on GitHub yet — this branch has no upstream — and
there is no local hook. Before claiming work is done, run the checks yourself
(`bun run verify` does all of them):

```bash
bunx biome check .                    # 0 errors
bun check                             # 0 errors, 228 files across 11 projects
bunx turbo run check:svelte --force   # 0 errors in dashboard + design-system
bunx turbo run build --force          # api binary + dashboard vite build
bunx turbo run test --force           # 174 pass / 0 fail
```

`bun check` is not cached by turbo and takes about half a second.

Turbo caches aggressively — pass `--force` when you need a real signal, or a
green run may just be a replay.

`apps/dashboard/static/**` has a `biome.json` override that turns off
`noSvgWithoutTitle` — the rule targets inline SVG, not static assets.

Do not claim completion from inspection alone. For UI work, render the page and
look at it. For behavior changes, exercise the endpoint or route.

---

## 5. Conventions

- **Bun-first.** Scripts, tests, the e2e runner (`Bun.spawnSync`) and the API
  run on Bun. Node exists only for the dashboard's production build
  (`adapter-node`, owner decision), which is why `mise.toml` and `engines`
  pin it. Types come from `@types/bun` (it brings the `node:*` types); the
  `node:*` modules used (`async_hooks`, `crypto`, `net`, `os`…) are ones Bun
  implements.
- **Versions** live in the root `package.json` `workspaces.catalog` /
  `workspaces.catalogs.dev`. Reference them as `"catalog:"` — never pin a
  version inside a package. The tree does not follow this yet (~42 literal
  pins, cleanup is phase 12 of the backlog card); new deps go through the
  catalog. All versions are exact (no `^`), so `bun update` is a no-op by
  design.
- **Runtime config** is a per-package `pack-env.ts` with a zod schema. Invalid
  env fails loudly at startup; no silent fallbacks. Secrets have a minimum
  length (`BETTER_AUTH_SECRET`, `CLIENT_IP_SECRET`: 32), URLs have no
  localhost default (`BETTER_AUTH_URL`, the dashboard's `API_URL`),
  `ORIGIN_ALLOWED` must hold real URLs, the API's `NODE_ENV` is one of
  `local|development|test|production`, and `SMTP_HOST` requires `SMTP_PORT`.
  `.env` files write unset values as `KEY=`; schemas that allow "unset" treat
  `''` as unset.
- **No silent fallbacks** generally — invalid state should throw, not degrade.
- **Comments** only where the reason is not obvious from the code.
- Match the surrounding style before introducing a new pattern.

### API

- Routes live in `apps/dashboard-api/src/main/routes/v1/<name>/` as
  `schema.ts` + `get.ts` + `index.ts`, registered on the v1 router with an
  OpenAPI tag.
- Errors go through `AppError` and the central handler in
  `main/infra/error-handler.ts`.
- `secureHeaders()` and a 1 MiB `bodyLimit` (413 `PAYLOAD_TOO_LARGE`) run on
  every route. No `hono/csrf`: no browser talks to the API, and better-auth
  checks the Origin of its own state-changing routes.
- `v1.use('/*', authMiddleware)` protects every v1 route; a path no handler
  matches skips it and falls to `app.notFound` (404 `NOT_FOUND`, JSON), so an
  unknown route is not reported as 401.
- Errors: a 5xx never echoes its message (AppError or HTTPException) — the
  detail stays in the log.
- Shutdown (`graceful-shutdown.ts` `drain`): `/ready` turns 503, a 3 s grace
  lets the load balancer drop the instance, `server.stop(false)` is awaited
  (in-flight requests finish), then DB, Redis and telemetry close — the
  telemetry flush is capped at 2 s (`settleWithin`) so a dead collector
  cannot hang it. SIGTERM/SIGINT exit 0, a crash exits 1. `HOST` is passed to
  `Bun.serve`. Hono applies
  middleware in registration order, so `/v1/openapi` and the Scalar UI —
  registered earlier — stay public by design.

### Dashboard

- Routes are `[locale]/(authenticated)/…` and `[locale]/(unauthenticated)/…`.
  Route groups do not appear in the URL: the panel is `/{locale}`, not
  `/dashboard`. Locales: `en` (default), `pt`, `es`. A path without a locale
  redirects keeping its query string; `<html lang>` follows the locale
  (`localeHandle` rewrites app.html's `lang="en"`).
- Account settings live on **Profile** (`/{locale}/profile`): profile data,
  appearance, language, 2FA and signed-in devices on one page, reached from
  the user menu. There is no separate Settings page (owner decision,
  2026-10-12: fewer places to configure things).
- **The browser never talks to the API.** The dashboard is a BFF: sign-in,
  sign-up and sign-out are form actions that call the API server-to-server
  through `authFetch`, and there is no `/auth/*` proxy (a request there just
  falls through to the locale redirect). The API has no CORS and belongs on an
  internal network. New flows (password reset, 2FA) follow the same shape.
- `authFetch` requires `clientIp` (`event.getClientAddress()`) and
  `clientIpSecret`, and sends the IP **signed** (`x-real-ip` +
  `x-client-ip-signature`, HMAC-SHA256 with a timestamp, valid 60 s;
  `@pack/auth/client-ip`), overwriting anything the caller passed: the API
  rate-limits by that IP, and every call comes from the dashboard's own
  address. `CLIENT_IP_SECRET` (≥ 32 chars) must be the same in
  `apps/dashboard-api/.env` and `apps/dashboard/.env.local`.
- `hooks.server.ts` composes `securityHandle → logHandle → localeHandle →
  sessionHandle → i18nHandle`, and redirects unauthenticated requests to
  `/{locale}/sign-in`.
- **CSP** is Kit's (`svelte.config.js` `kit.csp`, nonce mode): scripts only
  from self or with the per-request nonce, `frame-ancestors 'none'`, images
  also from DiceBear (`genericAvatar`). `securityHandle` adds
  `nosniff`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.
  Checked in Chromium (build and `vite dev`): no violations.
- `sessionHandle` → `resolveSession`: a valid cookie cache resolves locally;
  a stale one with a session token is revalidated on `/auth/get-session` and
  the fresh `session_data` is forwarded to the browser. A rejected token
  clears the cookies; an unreachable API is a 503 on protected routes. Loads
  read the user from `locals.user`, never by calling the API again. Over https
  the cache cookie is `__Secure-better-auth.session_data`, so `resolveSession`
  reads it by the request's protocol (`readSessionCache` in
  `@pack/auth/cookies`).
- Sign-out clears the browser's cookies even when the API is unreachable.
- Form actions and loads that call better-auth go through
  `callAuth(event, path, body?)` (`$lib/server/auth-api`; POST with a body, GET
  without), which sends the browser's cookies and user agent, the origin, the
  client IP and the request id.
- Server loads fetch the API through `createApiClient(cookieHeader, requestId)`
  and validate every response with `safeFetch(request, schema, locals.log)`,
  which logs every failure with its cause (`api.request.rejected`,
  `api.response.schema_mismatch`, `api.request.failed`). A `401` clears
  the `better-auth.*` cookies and redirects to sign-in.

### Auth

`better-auth` with email/password and argon2 (`@pack/tools`), Drizzle adapter.
The API mounts it at `/auth`. Policy (owner decisions, 2026-10-12; tested in
`apps/dashboard-api/test/e2e/routes/auth-security.e2e.test.ts`):

- **Sessions** last 24 h from sign-in and are never extended
  (`expiresIn` + `disableSessionRefresh`). They live in Redis
  (`secondaryStorage`) with a copy in Postgres (`storeSessionInDatabase`).
- **Cookie cache** 60 s: a revoked session keeps working in the dashboard for
  at most that long. Bump `AUTH_COOKIE.version` to invalidate every cache.
- **Cookies** are `HttpOnly` + `SameSite=Strict`. `BETTER_AUTH_URL` is the
  dashboard's public URL; when it is https, better-auth adds `Secure` and the
  `__Secure-` prefix.
- **Rate limit** on in every environment, stored in Redis, keyed by
  `x-real-ip` (3 sign-ins / 10 s per client). The API's `/auth` route
  (`stripUnverifiedClientIp`) keeps that header only with a fresh, valid
  signature; anything else is dropped (logged as `auth.client_ip.rejected`)
  and lands in better-auth's shared `no-trusted-ip` bucket. Network isolation
  is the first wall; the signature holds if the API is ever exposed.
- **Per-account limit** on the password step (`account-throttle.ts`, a local
  better-auth plugin): 5 free wrong passwords per email, then a doubling wait
  (2 s … 20 min) answered with the same 429, for any client. It slows the
  account instead of locking it, counts unknown emails too, keys Redis by a
  hash of the lowercased email, and resets on a correct password. About 86
  guesses fit in a day, under NIST's 100.
- **Sign-up** does not sign in (`autoSignIn: false`), so a duplicate email gets
  the same answer as a new one.
- **2FA (TOTP) is optional**, turned on per user in Profile (`twoFactor`
  plugin, table `two_factor`, tested in `two-factor.e2e.test.ts`). For such a
  user the password step returns `twoFactorRedirect` plus a `two_factor`
  cookie and no session; `/{locale}/sign-in/two-factor` finishes it with a
  TOTP or a single-use backup code. Enabling and disabling ask for the
  password and **rotate the session** — forward the new cookies or the user
  is signed out. `/two-factor/*` allows 3 requests / 10 s per client.
- **Signed-in devices** (Profile): better-auth core `list-sessions`,
  `revoke-session`, `revoke-other-sessions` (`sessions.e2e.test.ts`). The list
  carries each session's token, which is the credential: the dashboard maps it
  to `{ id, browser, system, ip, signedInAt, current }` (`$lib/server/devices`)
  and turns an id back into a token only server-side, from the user's own
  list. `callAuth` forwards the browser's `user-agent`, or every session would
  be labeled with the dashboard server's. A signed-out device stays open until
  its cookie cache expires (≤ 60 s).
- Settings both sides must agree on (`AUTH_COOKIE`, `CLIENT_IP_HEADER`) live in
  `@pack/auth/cookies`, which has no env access so the dashboard can import it.

The API now needs Redis to authenticate anything; a Redis outage is a 500 on
`/auth/*` and a 503 on the dashboard's protected routes.

When forwarding `Set-Cookie` from the API to the browser, use
`forwardSetCookies` / `clearAuthCookies` (`$lib/server/auth-cookies`). They
keep `encode: v => v` — SvelteKit's default `encodeURIComponent` re-encodes
better-auth's base64 payload and breaks HMAC verification on the next request.

### Load-bearing oddities

Things that look like leftovers or cleanup targets but are deliberate. Each was
measured or debugged; changing one regresses something.

- **`CSP_NONCE_PLACEHOLDER` in the root layout** — Kit only fills
  `%sveltekit.nonce%` in app.html and never hands the nonce to components,
  but ModeWatcher's inline theme script needs it. The layout renders the
  placeholder and `injectCspNonce` (`securityHandle`) swaps in the nonce Kit
  wrote into the response's CSP header. Without it the theme script is
  blocked and the page flashes the wrong theme.

- **`stripUnverifiedClientIp` edits `request.headers` in place** — never
  copy a request as `new Request(request, { headers })`: under Bun an empty
  `headers` init is ignored and the original headers survive
  (oven-sh/bun#41994; Node follows the spec), which let a request carrying
  only a spoofed `x-real-ip` keep it. The Biome plugin
  `biome-plugins/no-request-copy-with-headers.grit` fails the lint on that
  pattern (a URL input — string, template or `x.url` — is allowed).

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
- **`apps/dashboard-api/test/e2e/setup.ts` assigns `DATABASE_URL` with `=`, not `||=`** —
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
   `support_id`, `cf_ray_id?`, `route` (the handler pattern,
   `/v1/customers/:id`, or `(unmatched)`), `path` (the concrete URL),
   `method`, `status_code`, `duration_ms`, `ip`, `user_agent`, plus business
   fields added via `setContext()`. `ip` is the TCP peer — client-sent
   `X-Forwarded-For`/`CF-Connecting-IP` are never read — and `/auth` replaces
   it with the browser's IP once its signature checks out. The API's
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
(`sentry/scrub`). `beforeSend` (`scrubPii`) is an **allowlist** too: an event
keeps only the request method, the URL without its query string and a few
headers (`accept`, `content-type`, `content-length`, `x-request-id`);
breadcrumbs keep category/level/timestamp/type. A new field is dropped by
default. The pino logger `redact`s `password`, `token`, `secret` and
authorization/cookie headers (one level deep) as `[redacted]`.

`generateSupportId()` → `SUP-` + 12 uppercase hex. Set once per request,
returned to the client, sent to Sentry as a tag.

### Health split

- `/status` — liveness, always `{ status: 'ok' }`. Use for the container
  healthcheck and `livenessProbe`.
- `/ready` — readiness: checks the DB and the shutdown flag, returns `503`
  (`not_ready` / `shutting_down`). Use for `readinessProbe`.

### Telemetry topology

Sentry handles **errors only**. OpenTelemetry owns **traces + metrics** and
exports via OTLP to Grafana through an independent `BasicTracerProvider` /
`MeterProvider` (`instrumentation.ts`), with the `AsyncLocalStorage` context
manager and W3C propagation registered explicitly (no Node-specific SDK). HTTP spans come from `@hono/otel`, not
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
do it. Full strategy: `tasks/done/sampling-strategy.md`.

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

Branch `alpha/eco-system-v2`, ahead of `main`, no upstream.

The whole open backlog is one card, `tasks/todo/full-sweep-2026-10-11.md`,
executed in phases (one verified commit per slice). The only other card,
`i18n-paraglide-migration.md`, is deliberately parked. Largest open items:

1. **CI is written but unproven** — the workflow has never run on GitHub.
   Unit tests used to depend on the local `.env`; they now pass in a clean
   checkout (verified in a worktree with no `.env` files).
2. **Test coverage is concentrated** in 9 of 13 workspaces (174 unit + 56
   e2e). `bun test --coverage` only lists files a test imported, so
   per-workspace percentages overstate it. Gaps and plan: card item N5.
3. **Known bugs**: the remaining 🔴 item on the card is the Dockerfile
   (phase 6). Fixed: the 5-minute logout and the `/auth/*` 500 (phase 1), the
   rate limit (N6), the `db:reset` guard, the seed and the json-ld XSS
   (phase 3).
