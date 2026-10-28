# Eco System (Template)

A type-safe, full-stack **Bun + Turborepo** monorepo template: a Hono API and
a SvelteKit dashboard sharing a set of versioned `@pack/*` packages (auth, db,
observability, design system, i18n, and more). Batteries included —
structured logging, OpenTelemetry, Sentry, Drizzle migrations, and a Biome +
`turbo` verification pipeline — wired and ready to fork.

## Stack

- **Runtime / tooling** — Bun (version pinned in `mise.toml`), Turborepo,
  Biome, TypeScript (strict), Bun workspaces with a shared version **catalog**
  and `isolated` linker.
- **API** (`apps/dashboard-api`) — Hono, `@hono/zod-openapi`, Scalar API reference,
  OpenTelemetry via `@hono/otel`, Drizzle + `postgres.js`. Builds to a single
  compiled binary (`bun build --compile`).
- **Dashboard** (`apps/dashboard`) — SvelteKit 2, Svelte 5, Vite 8, Tailwind 4,
  `adapter-node`.
- **Cross-cutting** — `better-auth`, LogTape logging, OpenTelemetry traces +
  metrics → Grafana, Sentry error reporting, Drizzle ORM.

## Layout

```
apps/        deployable applications
packages/    shared @pack/* libraries
infra/       docker compose stacks (infra, observability, test)
scripts/     repo maintenance scripts
tasks/       task tracker (todo / done)
study/       reference material, not part of the build
```

### Apps

| App              | What it is                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| `apps/dashboard-api`       | Hono + Bun HTTP API. OpenAPI (zod) + Scalar docs, OTel-instrumented.     |
| `apps/dashboard` | SvelteKit admin dashboard (Svelte 5, Vite, Tailwind 4, `adapter-node`). |

### Packages

| Package                | Responsibility                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `@pack/auth`           | `better-auth` server + shared cookie config; sessions in Redis.       |
| `@pack/db`             | Drizzle ORM + `postgres.js`, schema, migrations, seeds.               |
| `@pack/observability`  | LogTape logging, OTel traces/metrics, Sentry, ALS request context.    |
| `@pack/design-system`  | Svelte 5 UI components, providers, Tailwind styles.                   |
| `@pack/i18n`           | Locale negotiation + dictionaries.                                    |
| `@pack/email`          | SMTP sending over nodemailer; templating is the caller's choice.      |
| `@pack/storage`        | Storage abstraction (configured via `pack-env`).                     |
| `@pack/cache`          | Cache helpers (one module per function).                              |
| `@pack/seo`            | JSON-LD helper (no importers by design; for forks).                   |
| `@pack/tools`          | Shared framework-agnostic utilities.                                  |
| `@pack/testing`        | Shared Bun test preload / helpers.                                    |
| `@pack/tsconfig`       | Shared TypeScript configs.                                            |

Each package keeps its TypeScript source under `src/` (the design system uses
`components/`, `hooks/`, `lib/`, `styles/`) and exposes explicit
subpath `exports`; runtime config lives in a per-package `pack-env.ts`.

## Getting started

**Prerequisites:** Bun (version pinned in `mise.toml`) and Docker.

```bash
# 1. Configure env (see "Configuration" below)
cp apps/dashboard-api/.env.example apps/dashboard-api/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp packages/db/.env.example packages/db/.env
#    then fill the secrets and ADMIN_PASSWORD

# 2. Install, start Postgres + Redis (waits until healthy), migrate, seed
bun run setup

# 3. Run everything (api + dashboard) through turbo
bun run dev
```

The dashboard is served at `http://localhost:3000`. Route groups are not part
of the URL, so the panel lives at the locale root — `/en`, `/pt` or `/es`, not
`/dashboard`. The API is at `http://localhost:3002`, with its Scalar reference
at `/v1` and the OpenAPI document at `/v1/openapi`. Browsers never call the
API: the dashboard's server does (it is a BFF).

`db:seed` creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in
`packages/db/.env`. There is no default password: set 8 to 128 characters or
the seed refuses to create the user (an existing admin is left alone).

### Configuration

Each app and package validates its own env at startup (`pack-env.ts`, zod) and
refuses to start with a missing or weak value — there are no silent defaults
for secrets or URLs.

| File | Holds |
| ---- | ----- |
| `apps/dashboard-api/.env` | API: database, Redis, auth, SMTP, observability |
| `apps/dashboard/.env.local` | Dashboard: `API_URL` and the two shared secrets |
| `packages/db/.env` | `db:*` scripts: `DATABASE_URL`, the seeded admin |

**Two secrets must be identical in the API and the dashboard** (32+
characters each; `openssl rand -base64 48`):

- `BETTER_AUTH_SECRET` — signs the session cookies; the dashboard verifies
  the cookie cache locally with it.
- `CLIENT_IP_SECRET` — the dashboard signs the visitor's IP with it; the API
  rate-limits by that IP and drops any IP without a valid signature.

`BETTER_AUTH_URL` (API) is the **dashboard's** public URL, not the API's: it
is what the browser sees, and an `https` URL turns on secure cookies.

### Ports

| Port        | Service                                       |
| ----------- | --------------------------------------------- |
| 3000        | dashboard (vite dev)                          |
| 3001        | Grafana (observability stack)                 |
| 3002        | API                                           |
| 4317 / 4318 | OTLP gRPC / HTTP                              |
| 5432        | Postgres                                      |
| 6379        | Redis                                         |

Grafana is published on 3001 rather than its native 3000 so the observability
stack and `bun run dev` can run side by side.

## Adding your own data

The API ships **without a domain on purpose**: the database holds only
better-auth's tables, and every v1 route is mock data except `GET /v1/me`,
the worked example of a route backed by the database. To add your own:

1. **Table** — a file in `packages/db/schema/<area>/`, exported from
   `packages/db/schema/index.ts`; reuse the helpers in `schema/utils`
   (`uuidv7()`, `createdAt()`, `updatedAt()`).
2. **Migration** — `bun run db:generate` writes it to `packages/db/migrations`,
   `bun run db:migrate` applies it (in production, the compose `migrate` job).
3. **Route** — `apps/dashboard-api/src/main/routes/v1/<name>/` with
   `schema.ts` (zod response), `get.ts` (`createRoute` + handler) and
   `index.ts`, registered in `routes/v1/index.ts` — copy `me/`. Wrap each
   query in `traced('SELECT', '<table>', () => …)` so it shows in the trace.
4. **Dashboard** — in a `+page.server.ts`, `createApiClient(...)` then
   `safeFetch(api.<name>.$get(), Schema, locals.log)`; the client is typed
   from the API's routes.
5. **Tests** — add the route to `test/e2e/routes/v1.e2e.test.ts` (401 without
   a session, its schema with one).

## Deploy

`infra/docker/docker-compose.prod.yml` is a production-like stack: Postgres,
Redis, a one-shot `migrate` job, the API and the dashboard. **Only the
dashboard publishes a port**; the API, Postgres and Redis stay on the compose
network.

```bash
cp infra/docker/.env.prod.example infra/docker/.env.prod   # fill the secrets
docker compose -f infra/docker/docker-compose.prod.yml \
  --env-file infra/docker/.env.prod up -d --build
```

The images build from the repo root (`docker build -f apps/<app>/Dockerfile .`)
with dependencies from `bun.lock`; the root `.dockerignore` keeps
`node_modules` and every `.env` out of the build context. The Dockerfiles are
generated: edit `apps/*/dofigen.yml`, then run `dofigen update` (pins image
digests) and `dofigen generate`.

- **API** — a single compiled binary (`bun build --compile`) on
  `oven/bun:1.4.3-slim`, as a non-root user.
- **Dashboard** — the `adapter-node` build on `node:26.10.0-slim`. Everything
  is bundled except `@opentelemetry/api`, so the runtime `node_modules` is a
  few MB.

Behind a TLS-terminating proxy, the dashboard needs two things from
`adapter-node`:

- The right public origin, which every form action is checked against
  (CSRF; a mismatch answers 403). adapter-node 6 has no runtime `ORIGIN`:
  it takes the request's `Host` and assumes `https`. Behind a TLS proxy
  that keeps `Host`, that is already right. A proxy that rewrites `Host`
  needs `HOST_HEADER=X-Forwarded-Host` (and `PROTOCOL_HEADER` if it is not
  https), commented in the compose — set them only behind a proxy that
  overwrites those headers. A plain-http deploy bakes the origin into the
  image instead: the `ORIGIN` build arg (`paths.origin`), which the compose
  sets from `PUBLIC_URL`.
- The proxy's client-address header, so rate limits and the device list see
  the visitor rather than the proxy: `ADDRESS_HEADER=X-Forwarded-For` and
  `XFF_DEPTH` = the number of proxies in front (commented in the compose).

## Scripts

Root scripts fan out across the workspace via Turborepo:

| Script                       | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `bun run dev`                | Run all apps in watch mode.                          |
| `bun run build`              | Build every workspace (runs `test` first).           |
| `bun run test`               | Run the test suites.                                 |
| `bun run test:e2e`           | API e2e suite on an ephemeral Postgres + Redis.      |
| `bun check`                  | Type check the TypeScript workspaces (Bun's checker). |
| `bun run check:svelte`       | `svelte-check` in the dashboard and design system.   |
| `bun run lint` / `format`    | Biome check (and `--write` to fix).                  |
| `bun run verify`             | Lint, type check, test and build — the pre-commit check. |
| `bun run setup`              | Install, start infra, migrate and seed.              |
| `bun run db:<task>`          | `generate`, `migrate`, `seed`, `reset`, `studio` in `@pack/db`. |
| `bun run docker:infra:up`    | Start Postgres + Redis and wait until healthy.       |
| `bun run docker:obs:up`      | Start the observability stack (Grafana, OTLP).       |

The e2e suite uses `infra/docker/docker-compose.test.yml`.

## Observability

The API emits structured logs (LogTape), OpenTelemetry traces + metrics, and routes
technical/critical errors to Sentry. The full contract (3-layer log fields,
classification → Sentry routing, `support_id`, `/status` vs `/ready` health
split, trace sampling, default-off behavior) is documented in
**`CLAUDE.md` → §6 Observability**.

To see traces/metrics locally:

```bash
bun run docker:obs:up
# set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 in the API and the
# dashboard env, then use the dashboard. Each page is one trace: the
# dashboard's handle/load/action spans with the API's spans (and its DB
# queries) beneath them. Grafana: http://localhost:3001
```

## Internationalization

Locales are `en` (default), `pt` and `es`, declared in
`packages/i18n/languine.json`. Dictionaries are committed JSON under
`packages/i18n/dictionaries/` and loaded lazily per locale at runtime.

`bun run translate` regenerates the target dictionaries from the `en` source via
[Languine](https://languine.ai) and needs `LANGUINE_PROJECT_ID` (see
`packages/i18n/.env.example`). Nothing at runtime reads that variable — it is
only for the translation step, and you can edit the dictionaries by hand
instead.

## Conventions

- **Versions** are centralized in the root `package.json` `workspaces.catalog` — reference
  them with `"catalog:"` instead of pinning per package.
- **Verification.** CI (`.github/workflows/ci.yml`) runs lint, typecheck,
  unit and e2e tests on pull requests. There is no commit hook: run
  `bun run verify` before calling a change done. `CLAUDE.md` §4 lists the
  checks.

## License

MIT
