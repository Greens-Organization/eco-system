# Boilerplate Report — `eco-system` v2

**Branch:** `alpha/eco-system-v2` (in-progress v2 rewrite) · **Generated:** 2026-06-16
**Runtime:** Bun 1.3.14 (pinned, `linker = "isolated"`) · **Build:** Turbo 2.9.11 · **Lint/Format:** Biome 2.4.14 · **TS:** 6.0.3
**Method:** full-codebase sweep by 6 parallel investigation agents (apps, packages, infra, tasks, git state), cross-verified against source.

This is a **descriptive** report — what the boilerplate *is* and how mature each part is. For the prescriptive companion (concrete fixes, modernization), see `CODE_IMPROVEMENT_REPORT.md`.

---

## 1. What this is

A Bun-native, Turbo-orchestrated monorepo boilerplate for a full-stack product: a **Hono API on Bun** (`apps/api`) and a **SvelteKit + Svelte 5 dashboard** (`apps/dashboard`), backed by **14 internal packages** (`@pack/*`) covering auth, db, observability, i18n, design-system, email, payments, cache, storage, rate-limit, seo, tools, testing, and shared tsconfig.

The v2 branch is a deliberate rewrite that ports an observability stack from a Fastify study repo to Hono/Bun, stands up a two-tier Bun test harness, drops Vitest, and adds Docker/dofigen packaging. The work is **functionally landed and verified but not yet committed** — it lives as one large in-flight diff (see §7).

### Stack at a glance

| Layer | Choice |
|---|---|
| Runtime | Bun 1.3.14 (isolated linker, exact deps, catalog versions) |
| API | Hono on Bun, `buildApp()` factory, `bun build --compile` |
| Dashboard | SvelteKit, Svelte 5 runes, shadcn-svelte design system |
| DB | postgres.js + Drizzle ORM, drizzle-kit migrations, `Bun.randomUUIDv7()` IDs |
| Auth | better-auth (email+password), argon2id via `Bun.password` |
| Observability | Pino + OpenTelemetry SDK 2.x + `@sentry/bun` (decoupled topology) |
| Validation | Zod (shared `pack-env.ts` schema convention per package) |
| Orchestration | Turbo pipeline; Biome single-pass lint/format |
| Containers | Dockerfile via dofigen; 3 compose files (infra / observability / test) |

---

## 2. Monorepo structure

```
eco-system/
├─ apps/
│  ├─ api/          Hono on Bun — layered (server → buildApp → middleware → routes)
│  └─ dashboard/    SvelteKit — locale-grouped routes, auth groups, design-system
├─ packages/        14 @pack/* packages (see §5)
├─ infra/docker/    docker-compose.{infra,observability,test}.yml
├─ tasks/           todo / in-progress / done — markdown planning system
├─ memory/          agent-md persistent state (progress.md authoritative)
├─ turbo.json, bunfig.toml, biome.json, package.json (workspace root)
└─ CLAUDE.md        agent-md directives
```

Conventions held across packages: **`exports` map**, **`pack-env.ts`** (Zod env schema), **centralized `tests/`** folder (not co-located), shared **`@pack/tsconfig`** base. (Uniformity of these conventions is itself partial — see §5 and the improvement report.)

---

## 3. `apps/api` — Hono on Bun

**Maturity: solid foundation, clean layering, thin feature surface.**

```
src/server.ts            boot: Bun.serve + graceful shutdown + setup
src/main/app.ts          buildApp() factory + default instance
src/main/setup.ts        startup banner (timezone() is a no-op stub)
src/main/middleware/      observability, auth-middleware, barrel
src/main/infra/           error-handler, graceful-shutdown, openapi/
src/main/routes/public/   status (liveness), ready (readiness), auth (better-auth)
src/main/routes/v1/       OpenAPIHono + Scalar docs + stats (mock data)
src/core/env.ts          Zod-validated env (merges pack schemas)
```

- **Wiring is correct:** instrumentation imported first (SDK before app), middleware order CORS → requestId → OTel → observability → prettyJSON → routes → `onError`. The `buildApp()` factory enables isolated test apps.
- **Migration is complete:** `health.ts` → `status.ts`/`ready.ts` split and `request-logger.ts` → `observability.ts` replacement left **no dangling references**.
- **Type discipline is strong:** no `any`, no `@ts-ignore` anywhere in `src/` or `test/`.
- **Feature surface is intentionally thin:** the only `v1` endpoint (`stats`) returns 100% hardcoded mock data — expected for a boilerplate, flagged so it isn't mistaken for real.
- **Loose ends:** `setup.timezone()` is a no-op; the Dockerfile `HEALTHCHECK` uses `curl` (absent in the `oven/bun` base); `docker:infra:*` scripts point at a nonexistent `docker-compose.local.yml`; `apps/api/docker-compose.yml` and `.dockerignore` are 0-byte placeholders.

### Test environment (the headline addition)

A genuinely robust **two-tier** harness:

- **Unit** (`test/unit`, `bun test --preload @pack/testing/preload`) — no Docker. DI-based (`createReadyRoute(deps)`), `mock-db` via `mock.module`, stays off `@pack/db`/`@pack/auth`. **10/10 passing.**
- **E2E** (`test/e2e/run.ts`) — orchestrator: `compose up --wait` → `bun test test/e2e` (E2E=1) → `compose down` in `finally`. Ephemeral tmpfs Postgres (`:5436`), migrate in `beforeAll`, `TRUNCATE … RESTART IDENTITY CASCADE` per test, real better-auth sign-up/sign-in flow, factories. **7/7 passing.**
- **Safety guard:** a DB-name guard throws unless `DATABASE_URL` contains `eco_test`. (Note: a `=` vs `||=` bug in `setup.ts:8` currently makes it decorative — see improvement report item #3.)

---

## 4. `apps/dashboard` — SvelteKit + Svelte 5

**Maturity: small, clean, idiomatic — skeletal feature set.**

- **No Next.js leftovers** (clean migration); ~31 source files.
- **Uniform Svelte 5 runes** (`$state`/`$derived`/`$props`/`$derived.by`), `$app/state` (not deprecated `$app/stores`), `Snippet`/`{@render}`, `<script module>` for variants. Idiomatic throughout.
- **Server/client split is clean:** Pino/better-auth never leak to the browser; `hooks.server.ts` composes `sequence(logHandle, authHandle, localeHandle, sessionHandle, i18nHandle)` correctly.
- **Locale-aware routing** via `[locale]` route groups + `(authenticated)`/`(unauthenticated)` groups.
- **Skeletal surface:** 4 of 5 sidebar nav links (`/customers`, `/employees`, `/settings`, `/profile`) point at routes that don't exist yet. The auth flow (sign-in/sign-up/sign-out) and the dashboard index are the only live pages.
- **Known rough edges (detail in improvement report):** a triple-declared Stats contract where the Zod schema is never executed; a duplicate `get-session` fetch that ignores `locals.user`; unsound `as string` casts on FormData.

---

## 5. Packages — maturity scorecard

14 packages. Honest maturity classification:

| Package | Maturity | Real logic? | `exports` map | tsconfig | tests | Notes |
|---|---|---|---|---|---|---|
| `observability` | **Mature** | Yes | ✅ (7 subpaths) | ✅ | ✅ (30/30) | Reorganized into `errors/logger/context/sentry/`; OTel 2.x + Sentry decoupled. The reference for structure. |
| `i18n` | **Mature** | Yes | ✅ | ✅ | ❌ | Most complete leaf: locale resolution, lazy dictionaries, Intl formatters, 3 dictionaries. |
| `design-system` | **Mature** | Yes | ❌ | ✅ | ❌ | Largest: shadcn-svelte components, OKLCH tokens, Svelte 5. *Is* the UI reference, but lacks an `exports` map and mixes code styles. |
| `db` | **Mature** | Yes | ❌ | ✅ | ❌ | postgres.js + Drizzle, migrations, seed, `Bun.randomUUIDv7()`. Missing `exports` map despite subpath imports. |
| `auth` | **Mature** | Yes | ✅ | ✅ | ❌ | better-auth email+password, argon2id via `@pack/tools`. `BETTER_AUTH_SECRET` validated but not wired into config. |
| `testing` | **Mature** | Yes | ✅ | ✅ | ✅ | Bun preload + runner; `setTestEnv` (partial env reset). |
| `email` | **Implemented** | Yes | ❌ (broken barrel) | ⚠ wrong base | ❌ | nodemailer + react-email. Barrel uses bare specifiers + a phantom `templates/contact` export → throws on import. |
| `tools` | **Implemented** | Yes | ❌ | ✅ | ❌ | argon2 adapter (used), uuid-tail, string utils. No `exports`/`main` — bare-import via Bun fallback. |
| `seo` | **Implemented (orphaned)** | Yes | ✅ | ✅ | ❌ | Metadata + JSON-LD generators. **Zero importers** in the repo. |
| `storage` | **Thin wrapper** | No | ❌ | ✅ | ❌ | Pure passthrough re-export of `@vercel/blob`; declared `BLOB_READ_WRITE_TOKEN` unused. |
| `rate-limit` | **Thin** | Minimal | ❌ | ❌ missing | ❌ | One Upstash factory. Optional env vs required client type → deferred runtime failure. |
| `cache` | **Placeholder** | No | ❌ | ❌ missing | ❌ | No `index.ts`. Only `pack-env` (hard-requires `REDIS_URL`) + deps (`bullmq`/`ioredis`). |
| `payments` | **Placeholder** | No | ❌ | ✅ | ❌ | Only `package.json` + `tsconfig`. No source. |
| `tsconfig` | **Mature** | n/a | n/a | n/a | n/a | `bun.json` + `svelte.json` bases. Modern flags; `svelte.json` weakens `noUncheckedIndexedAccess`. |

**Summary:** 6 mature, 3 implemented (1 orphaned, 1 with a broken barrel), 2 thin, 2 placeholders, 1 config base.

The single most consequential structural gap: the **`exports`-map convention is upheld by only ~half the packages** — and notably *not* by the two most heavily imported ones (`tools`, `design-system`). They resolve today only via Bun's filesystem fallback.

---

## 6. Infrastructure & tooling

- **Turbo** pipeline coherent; notable choice: `build.dependsOn: ["^build", "test"]` (build runs the package's tests first). No root `typecheck` script though the task exists in `turbo.json`.
- **Catalog** usage is clean and consistent (single + named `dev` catalog); the removed Vitest catalog has **no dangling references**.
- **Biome** single-pass; generated shadcn dirs are denylisted (and therefore not normalized — source of design-system style drift).
- **Docker:** 3 compose files under `infra/docker/` (infra = pg+redis, observability = Grafana LGTM, test = ephemeral tmpfs Postgres). `apps/api` dockerization is in-flight and has rough edges: empty `docker-compose.yml`, `curl`-based healthcheck, and a `dofigen.yml` that binds a **phantom `packages/analytics`** (doesn't exist).
- **README** at root is a **1-line stub** — the clearest documentation gap for a template repo.

---

## 7. In-flight (uncommitted) work

The branch holds **one large, internally-consistent diff** — 33 tracked files changed (+580/−337) plus ~20 untracked paths — that collectively accomplishes:

- **A.** `@pack/observability` restructure + OTel/Sentry wiring (folders, `exports` map, OTel SDK 2.x, `@sentry/bun`).
- **B.** The `apps/api` two-tier test environment (entire `test/` tree, `buildApp()` refactor, test scripts, drizzle/postgres devDeps).
- **C.** Root/testing infra: Vitest dropped (dep + catalog), `@pack/testing` migrated JS→TS + Bun preload, new compose files.
- **D.** `apps/api` dockerization (Dockerfile, dofigen, `.dockerignore`).

Deletions (`request-logger.ts`, `public/health.ts`, `observability/log.ts`, `testing/index.js`) are **intentional**, each with a documented replacement in `memory/progress.md`. Nothing is committed yet — the recommendation is to **split this blob into reviewable commits** before landing.

### Planning & memory state

- `memory/progress.md` is **authoritative and accurate** (matches disk, no dangling refs). The other memory files (`plan/agents/verify/gotchas.md`) are still unfilled agent-md template stubs.
- `tasks/` uses a `todo/in-progress/done` markdown system. Active roadmap: `tasks/todo/boilerplate-gaps-audit.md` (P0–P2 gap audit) — but it still references the old `tasks/completed/` paths (renamed to `tasks/done/`) and predates several now-done items.
- Several completed task docs are written but **untracked** (should be committed alongside the code they document).

---

## 8. Overall assessment

**Grade: B− — strong, modern bones; consistency and follow-through are the gap, not architecture.**

What's genuinely good: a Bun-native, strict-TypeScript baseline; a cleanly layered API; a robust two-tier test harness verified end-to-end; idiomatic Svelte 5; a decoupled observability stack. This is above-average for a boilerplate.

What holds it back from production-ready:

1. **Convention drift** — `exports` maps, test scripts, error-throwing, and `pack-env` strictness applied unevenly across packages.
2. **Validated-then-discarded config** — `BETTER_AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` computed and never used.
3. **A few import-time hazards** — the broken `@pack/email` barrel, the phantom dofigen `analytics` bind, empty docker artifacts.
4. **Unfinished surface** — placeholder packages (`payments`, `cache`), orphaned `seo`, dead dashboard routes, mock-only `stats`, stub README.
5. **Security nits** — argon2 `memoryCost` under the OWASP baseline; the e2e DB-name guard neutralized by a `=`/`||=` slip.

None of this is architectural. The boilerplate needs **finishing and tightening**, not redesign. The prioritized path is in `CODE_IMPROVEMENT_REPORT.md` (items 1–9 remove the genuinely dangerous gaps and are mostly small-effort).
