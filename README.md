# Eco System (Template)

A type-safe, full-stack **Bun + Turborepo** monorepo template: a Hono API and
a SvelteKit dashboard sharing a set of versioned `@pack/*` packages (auth, db,
observability, design system, i18n, and more). Batteries included —
structured logging, OpenTelemetry, Sentry, Drizzle migrations, and a Biome +
`turbo` verification pipeline — wired and ready to fork.

## Stack

- **Runtime / tooling** — Bun (version pinned in `.tool-versions`), Turborepo,
  Biome, TypeScript (strict), Bun workspaces with a shared version **catalog**
  and `isolated` linker.
- **API** (`apps/api`) — Hono, `@hono/zod-openapi`, Scalar API reference,
  OpenTelemetry via `@hono/otel`, Drizzle + `postgres.js`. Builds to a single
  compiled binary (`bun build --compile`).
- **Dashboard** (`apps/dashboard`) — SvelteKit 2, Svelte 5, Vite 8, Tailwind 4,
  `adapter-node`.
- **Cross-cutting** — `better-auth`, pino logging, OpenTelemetry traces +
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
| `apps/api`       | Hono + Bun HTTP API. OpenAPI (zod) + Scalar docs, OTel-instrumented.     |
| `apps/dashboard` | SvelteKit admin dashboard (Svelte 5, Vite, Tailwind 4, `adapter-node`). |

### Packages

| Package                | Responsibility                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `@pack/auth`           | `better-auth` server/client + cookies; session config.                |
| `@pack/db`             | Drizzle ORM + `postgres.js`, schema, migrations, seeds.               |
| `@pack/observability`  | pino logging, OTel traces/metrics, Sentry, ALS request context.       |
| `@pack/design-system`  | Svelte 5 UI components, providers, Tailwind styles.                   |
| `@pack/i18n`           | Locale negotiation + dictionaries.                                    |
| `@pack/email`          | SMTP sending over nodemailer; templating is the caller's choice.      |
| `@pack/storage`        | Storage abstraction (configured via `pack-env`).                     |
| `@pack/cache`          | Cache helpers (one module per function).                              |
| `@pack/seo`            | Metadata + JSON-LD helpers.                                           |
| `@pack/tools`          | Shared framework-agnostic utilities.                                  |
| `@pack/testing`        | Shared Bun test preload / helpers.                                    |
| `@pack/tsconfig`       | Shared TypeScript configs.                                            |

Each package keeps its TypeScript source under `src/` and exposes explicit
subpath `exports`; runtime config lives in a per-package `pack-env.ts`.

## Getting started

**Prerequisites:** Bun (version pinned in `.tool-versions`) and Docker.

```bash
bun install

# 1. Bring up Postgres and Redis
bun run docker:infra:up

# 2. Configure env — each app/package reads its own .env via pack-env.
#    At minimum set DATABASE_URL for @pack/db.

# 3. Apply migrations (and optionally seed an admin user)
cd packages/db && bun run db:migrate && bun run db:seed && cd -

# 4. Run everything (api + dashboard) through turbo
bun run dev
```

The dashboard is served at `http://localhost:3000`. Route groups are not part
of the URL, so the panel lives at the locale root — `/en`, `/pt` or `/es`, not
`/dashboard`. The API is at `http://localhost:3002`, with its Scalar reference
at `/v1` and the OpenAPI document at `/v1/openapi`.

`db:seed` prints the credentials it created (`ADMIN_EMAIL` / `ADMIN_PASSWORD`
from `packages/db/.env`, defaulting to `admin@example.com` / `admin`).

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

## Scripts

Root scripts fan out across the workspace via Turborepo:

| Script                       | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `bun run dev`                | Run all apps in watch mode.                          |
| `bun run build`              | Build every workspace (runs `test` first).           |
| `bun run test`               | Run the test suites.                                 |
| `bun run lint` / `format`    | Biome check (and `--write` to fix).                  |
| `bun run docker:infra:up`    | Start Postgres + Redis.                              |
| `bun run docker:obs:up`      | Start the observability stack (Grafana, OTLP).       |

Typecheck has no root alias — call `bunx turbo run typecheck`. Per-package:
`bun run typecheck`, and in `apps/api` the e2e suite via `bun run test:e2e`
(uses `infra/docker/docker-compose.test.yml`).

## Observability

The API emits structured pino logs, OpenTelemetry traces + metrics, and routes
technical/critical errors to Sentry. The full contract (3-layer log fields,
classification → Sentry routing, `support_id`, `/status` vs `/ready` health
split, trace sampling, default-off behavior) is documented in
**`CLAUDE.md` → §6 Observability**.

To see traces/metrics locally:

```bash
bun run docker:obs:up
# set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 in the API env, then
# generate traffic against the API. Grafana: http://localhost:3001
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

- **Versions** are centralized in the root `package.json` `catalog` — reference
  them with `"catalog:"` instead of pinning per package.
- **Verification is manual.** There is no CI and no commit hook: run
  `bunx turbo run typecheck`, `bun run lint` and `bun run test` yourself before
  calling a change done. `CLAUDE.md` §4 lists the checks and the currently
  known failures.

## License

MIT
