# Eco System (Template)

A type-safe, full-stack **Bun + Turborepo** monorepo template: a Hono API and
a SvelteKit dashboard sharing a set of versioned `@pack/*` packages (auth, db,
observability, design system, i18n, and more). Batteries included —
structured logging, OpenTelemetry, Sentry, Drizzle migrations, and a Biome +
`turbo` verification pipeline — wired and ready to fork.

## Stack

- **Runtime / tooling** — Bun `1.3.14`, Turborepo, Biome, TypeScript (strict),
  Bun workspaces with a shared version **catalog** and `isolated` linker.
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
memory/      agent working state (plan, progress, gotchas)
tasks/       task tracker (todo / done)
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
| `@pack/email`          | React Email templates + sending (nodemailer / Resend).               |
| `@pack/storage`        | Storage abstraction (configured via `pack-env`).                     |
| `@pack/cache`          | Cache helpers (one module per function).                              |
| `@pack/seo`            | Metadata + JSON-LD helpers.                                           |
| `@pack/tools`          | Shared framework-agnostic utilities.                                  |
| `@pack/testing`        | Shared Bun test preload / helpers.                                    |
| `@pack/tsconfig`       | Shared TypeScript configs.                                            |

Each package keeps its TypeScript source under `src/` and exposes explicit
subpath `exports`; runtime config lives in a per-package `pack-env.ts`.

## Getting started

**Prerequisites:** Bun `1.3.14` and Docker.

```bash
bun install

# 1. Bring up Postgres (and the rest of the local infra)
bun run docker:infra:up

# 2. Configure env — each app/package reads its own .env via pack-env.
#    At minimum set DATABASE_URL for @pack/db.

# 3. Apply migrations (and optionally seed)
cd packages/db && bun run db:migrate && bun run db:seed && cd -

# 4. Run everything (api + dashboard) through turbo
bun run dev
```

## Scripts

Root scripts fan out across the workspace via Turborepo:

| Script                       | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `bun run dev`                | Run all apps in watch mode.                          |
| `bun run build`              | Build every workspace.                               |
| `bun run test`               | Run the test suites.                                 |
| `bun run lint` / `format`    | Biome check (and `--write` to fix).                  |
| `bun run docker:infra:up`    | Start the local infra stack (Postgres, …).           |
| `bun run docker:obs:up`      | Start the observability stack (Grafana, OTLP).       |

Per-package: `bun run typecheck`, and in `apps/api` the e2e suite via
`bun run test:e2e` (uses `infra/docker/docker-compose.test.yml`).

## Observability

The API emits structured pino logs, OpenTelemetry traces + metrics, and routes
technical/critical errors to Sentry. The full contract (3-layer log fields,
classification → Sentry routing, `support_id`, `/status` vs `/ready` health
split, default-off behavior) is documented in **`CLAUDE.md` → §16
Observabilidade**.

To see traces/metrics locally:

```bash
bun run docker:obs:up                          # Grafana at http://localhost:3000
# set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 in the API env, then
# generate traffic against the API.
```

## Conventions

- **Versions** are centralized in the root `package.json` `catalog` — reference
  them with `"catalog:"` instead of pinning per package.
- **Verification is the contract.** Type-check, lint, tests, and (for the API)
  the e2e suite must pass; see `CLAUDE.md` for the full agent/verification
  directives and `memory/` for working state.

## License

MIT
