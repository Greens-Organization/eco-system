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
apps/dashboard     SvelteKit 3 / Svelte 5 admin dashboard
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
bun run test:browser         # Playwright: compose + API + dashboard build (SKIP_BUILD=1 reuses it)

# Production-like stack (only the dashboard publishes a port), README "Deploy":
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod up -d --build
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
disagree with it. It stays on 6: the `typescript@7` package no longer ships
the JS compiler API, and `svelte-check` 4.7.6 (latest) needs it. Its
`--tsgo` mode (TS 7 aliased as `@typescript/native` next to TS 6) was
tried and is not ready: it reports false errors on the `<script module>`
exports of design-system components imported from the dashboard, and in the
design-system itself checks 134 files where the normal mode checks 4752.

`@app/dashboard-api`, `@app/dashboard-svelte`, `@pack/auth`, `@pack/db`,
`@pack/observability`, `@pack/tools`, `@pack/testing`, `@pack/email`,
`@pack/i18n` and `@pack/seo` define `test`. The
dashboard's run under plain `bun test` (no Vite), so they cover `src/lib`
modules that do not import `$app/*`; keep server logic there
(`src/lib/server/*`) and inject what touches the network.

The browser suite (`apps/dashboard/test/browser`, Playwright, Chromium) drives
the production build against the real API. Selectors come from the `en`
dictionary, not literal copy. Each test and each extra device sends its own
`x-forwarded-for` (the dashboard runs with `ADDRESS_HEADER`), so the 3 / 10 s
sign-in limit applies per test. An automatic fixture fails any test that
logs a CSP violation or an uncaught page error. After clicking a link, wait
for the new URL before filling a field: client-side navigation keeps the old
page (and its same-named inputs) on screen until the data arrives. The test
compose has fixed container names, so this suite and `test:e2e` cannot run
at the same time.

The root `bunfig.toml` sets `[run] bun = true`, so a script started from the
root (including through `--filter`) gets a Bun-backed `node` shim first on
`PATH`; `test/browser/run.ts` drops it so Playwright and `node build` get
the real Node.

Tests live in `test/` in every workspace and preload `@pack/testing/preload`
(`NODE_ENV=test`, exporters off, `LOG_LEVEL=silent` — a test that asserts on
logs builds its own logger with an explicit level). Each workspace's
`bunfig.toml` sets `coverageThreshold`, which Bun checks **per file**, and
ignores `../**`, so it measures only its own code: the floor is today's
weakest file, to be raised, never lowered. Coverage still lists only files
some test imported.

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
| 1025 / 8025 | e2e Mailpit SMTP / UI and API (`docker-compose.test.yml`) |
| 3030 / 3032 | browser tests: dashboard build / API (`apps/dashboard/test/browser/stack.ts`) |

---

## 4. Verification

`.github/workflows/ci.yml` runs `biome ci`, `bun check`, `turbo check:svelte
build` (`build` depends on `test`), the API
e2e suite and the browser suite on pull requests and on pushes to `main`, with bun/node from
`mise.toml`. It has not run on GitHub yet — this branch has no upstream — and
there is no local hook. Before claiming work is done, run the checks yourself
(`bun run verify` does all of them):

```bash
bunx biome check .                    # 0 errors
bun check                             # 0 errors, 258 files across 11 projects
bunx turbo run check:svelte --force   # 0 errors in dashboard + design-system
bunx turbo run build --force          # api binary + dashboard vite build
bunx turbo run test --force           # 208 pass / 0 fail
bun run test:coverage                 # same, under each workspace's coverage floor
bun run test:e2e                      # 76 pass (needs Docker)
bun run test:browser                  # 20 pass (needs Docker)
```

`bun check` is not cached by turbo and takes about half a second.

Turbo caches aggressively — pass `--force` when you need a real signal, or a
green run may just be a replay. The hash includes every `.env` / `.env.local`
(`bun test` loads the one in its folder) and `NODE_ENV`; `test` tasks do not
wait on each other.

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
  `workspaces.catalogs.dev` (type, check and test tooling). Reference them
  as `"catalog:"` / `"catalog:dev"` — never pin a version inside a package;
  every workspace follows this. All versions are exact (no `^`), so
  plain `bun update -r` only refreshes transitive deps in `bun.lock`;
  `bun update -r --latest` moves every pin, catalogs included. Run the whole
  gate (`verify`, `test:coverage`, `test:e2e`, `test:browser`) after.
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

- Internal imports use the API's `package.json` `imports`: `#core/…`,
  `#infra/…`, `#main/…` (no extension; a folder is `…/index`). TypeScript
  resolves them from the nearest `package.json`, so the dashboard can
  type-check `AppType` without knowing the API's paths. No `@/` tsconfig
  paths.
- Routes live in `apps/dashboard-api/src/main/routes/v1/<name>/` as
  `schema.ts` + `get.ts` + `index.ts`, registered on the v1 router with an
  OpenAPI tag. Database queries go through `traced(operation, table, query)`
  (`@pack/db`), which opens an OTel client span under the request's trace
  (postgres.js has no auto-instrumentation).
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

- **SvelteKit 3.** Kit's config is the `sveltekit({...})` options in
  `vite.config.ts` (there is no `svelte.config.js`): adapter, CSP,
  `tracing`, `paths.origin`; no `alias` (deprecated in Kit 3). `AppType`
  is a type-only relative import of the API's `routes/v1/index.ts`.
  `src/lib` is imported as `#lib/….js`
  (`package.json` `imports`), not `$lib`. Env vars are declared in
  `src/env.ts` (`defineEnvVars`, zod schemas, optional only while
  `building`) and read from `$app/env/private` through `#lib/env.js`; Kit
  validates them at start and fails loudly.
- **Origin.** Form actions are CSRF-checked against the app's origin.
  adapter-node 6 has no runtime `ORIGIN`: it takes the request `Host` and
  assumes https (or `HOST_HEADER` / `PROTOCOL_HEADER`). `paths.origin`
  comes from `ORIGIN` **at build time** — the Docker build arg, the browser
  test runner — for plain-http deploys. A wrong origin is a 403 on every
  form.
- `handleError` (server and client) receives every error in Kit 3:
  `unknown` ones are logged as errors and sent to Sentry; `framework` ones
  (a 404 from Kit) are one warn line; `app` ones (`error(...)` in our code)
  are not logged again — the throwing code already did.
- **Loading:** loads are SSR, so a skeleton only exists on client-side
  navigation. The authenticated layout swaps the page for `PageSkeleton`
  (shaped like the destination: home, list, detail, profile) when a
  navigation into the panel takes over 200 ms; faster ones never show it.
  A new page type gets its shape there.
- Routes are `[locale]/(authenticated)/…` and `[locale]/(unauthenticated)/…`.
  Route groups do not appear in the URL: the panel is `/{locale}`, not
  `/dashboard`. Locales: `en` (default), `pt`, `es`. A path without a locale
  redirects keeping its query string; `<html lang>` follows the locale
  (`localeHandle` rewrites app.html's `lang="en"`).
- **Switching language is a client-side navigation** (`goto`, no reload):
  in vite dev a reload re-requests every module. The `[locale]` layout
  remounts the tree under `{#key data.locale}` (components read the
  dictionary once) and sets `<html lang>`. Kit reruns a load only when
  something it read changed and cannot see `locals`, so **a load that
  renders by language takes the locale from `loadLocale(event)`**
  (`#lib/server/locale.js`, reads `params.locale`); one that read
  `locals.locale` would keep the old language after a switch or a
  back/forward (`test/browser/i18n.spec.ts`).
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
- **CSP** is Kit's (the `sveltekit({ csp })` options in `vite.config.ts`, nonce mode): scripts only
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
- **Password reset**: `/{locale}/forgot-password` always shows the same
  message, and the API does not await the mail (SMTP latency would reveal
  which accounts exist). The link points at `/{locale}/reset-password` on the
  dashboard; `sendResetPassword` drops a link whose origin is not in
  `trustedOrigins`, and the page is served with `Referrer-Policy: no-referrer`
  (`securityHandle` never overwrites a header a page set). A reset signs every
  device out. `advanced.disableOriginCheck: false` is explicit because
  better-auth skips the origin check under `NODE_ENV=test`; e2e requests
  send an `Origin`. Tested against real mail in `password-reset.e2e.test.ts`.
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

- **Design-system components are copied, not generated in place** — the
  shadcn-svelte CLI expects a SvelteKit app (`$lib` aliases, `svelte-kit
  sync`) and this package is not one. To add one: run
  `bunx shadcn-svelte@<version> add <name> --no-deps` in a throwaway SvelteKit
  skeleton, copy `src/lib/components/ui/<name>/` into
  `packages/design-system/components/ui/`, rewrite `$lib/utils.js` →
  `../../../lib/utils.js` and `$lib/components/ui/<x>/index.js` →
  `../<x>/index.js`, add any new dependency through the catalog, then
  `biome check --write`. The package is linted and formatted like the rest.
- **The v1 routes are mock data, except `GET /v1/me`** — the template has no
  domain on purpose (each fork models its own). `stats`, `customers` and
  `employees` stay mocked; do not "fix" them by inventing tables. `/v1/me` is
  the one database-backed example (`traced` query, e2e), and README "Adding
  your own data" is the recipe.
- **The dashboard's runtime deps are `devDependencies`** — only `pino`,
  `pino-pretty` and `@opentelemetry/api` sit in `dependencies`. adapter-node bundles devDependencies
  and leaves dependencies external, so this keeps the image's
  `node_modules` at ~3 MB instead of ~330 MB of workspace dev tooling
  (drizzle-kit, typescript, rolldown…). pino stays external because its
  transport resolves the worker via `__dirname`; Kit's tracing imports
  `@opentelemetry/api` and the adapter leaves it external, so the image
  failed to start without it. A new runtime dep of the dashboard goes in
  `devDependencies` unless it must not be bundled.
- **`src/env.ts` makes every variable optional while `building`** —
  `vite build` runs the app to analyse it, and the Docker build has no
  runtime env (no secrets in images). Kit still validates, and fails loudly,
  at server start.
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
- **Lucide icons are imported one by one** (`@lucide/svelte/icons/<name>`).
  The `@lucide/svelte` and `@lucide/svelte/icons` barrels make vite dev
  serve all ~1900 icons on every page load (1995 requests per reload on
  sign-in, 121 without); Biome's `noRestrictedImports` rejects them.
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
- **`@pack/storage` has no importers either, by design** — a thin wrapper
  over Bun's native `S3Client` (AWS S3, R2, MinIO) for whoever forks the
  template. Its `pack-env` requires the `S3_*` vars, so importing it without
  them fails at startup.
- **`@pack/email` takes an HTML string, not a component** — the react-email
  templates were removed in 2026-09 so no React remains in the monorepo.
  Templating is the caller's choice; `sendEmailHtml` and `sendBatchEmailHtml`
  only do SMTP over nodemailer. With no `SMTP_HOST` they log and skip, except
  in production, where they throw; SMTP auth is sent only when `SMTP_USER`
  is set (Mailpit takes none).

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
   and `/ready` are not access-logged.
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
breadcrumbs keep category/level/timestamp/type; stack frames lose their
local `vars`. A new field is dropped by default. That is the second wall:
Sentry 11 collects users, cookies, headers, bodies, query strings and frame
variables **by default** (`sendDefaultPii` is gone), so `telemetry.ts` turns
each off in `dataCollection`. Its options are typed `satisfies NodeOptions`
so a renamed option fails `bun check` instead of being ignored. The pino logger `redact`s `password`, `token`, `secret` and
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
`MeterProvider` (`telemetry.ts`), with the `AsyncLocalStorage` context
manager and W3C propagation registered explicitly (no Node-specific SDK). HTTP spans come from `@hono/otel`, not
require-hook auto-instrumentation, so Bun import order is not fragile.

Two entries start that core: `@pack/observability/instrumentation`
(`@sentry/bun`, the API) and `…/instrumentation/node` (`@sentry/node`, the
dashboard — `@sentry/bun` patches `Bun.serve` and throws under Node).
`captureError` goes through `@sentry/core`, which both register into.

The dashboard loads it from `src/instrumentation.server.ts` and turns on
SvelteKit's own spans (`tracing: { server: true }`; Kit 3 loads the
instrumentation file on its own): `sveltekit.handle.root`, each sequenced hook,
`sveltekit.load`, `sveltekit.form_action`. `authFetch` and
`createApiClient` send `traceparent` (`traceHeaders()`), so a page is one
trace down to the API's DB spans, and both services log the same
`trace_id`. Its `handleError` reports `unknown` errors to Sentry with the
`errorId` as `support_id`. It flushes on adapter-node's `sveltekit:shutdown`.

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

The 2026-10-11 sweep is closed (`tasks/done/full-sweep-2026-10-11.md`).
`i18n-paraglide-migration.md` is deliberately parked. Largest open items:

1. **CI is written but unproven** — the workflow has never run on GitHub.
   Unit tests used to depend on the local `.env`; they now pass in a clean
   checkout (verified in a worktree with no `.env` files).
2. **Test coverage is concentrated** in 10 of 13 workspaces (208 unit + 76
   API e2e + 20 browser); `cache`, `storage` and `design-system` have none.
   Per-file coverage floors guard against regressions, not gaps: a file no
   test imports is not measured at all.
3. **Known bugs**: none open. Fixed: the Dockerfile (phase 6),
   the 5-minute logout and the `/auth/*` 500 (phase 1), the
   rate limit (N6), the `db:reset` guard, the seed and the json-ld XSS
   (phase 3).
