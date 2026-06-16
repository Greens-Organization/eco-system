# Technical Analysis — `eco-system` v2

**Branch:** `alpha/eco-system-v2` · **Generated:** 2026-06-16
**Runtime:** Bun 1.3.14 (pinned, `linker = "isolated"`) · **Build:** Turbo 2.9.18 · **Lint/Format:** Biome 2.5.0 · **TS:** 6.0.3
**Last dependency update reflected:** 2026-06-16 (repo-wide bump — see §4)
**Method:** consolidation of the prior `BOILERPLATE_REPORT.md` (descriptive state) and `CODE_IMPROVEMENT_REPORT.md` (prescriptive fixes), plus three new investigations: (a) dependency currency & security across the principal deps, (b) a root-cause analysis of the dashboard's 10–15s dev cold-start, (c) a web sweep of SvelteKit/Vite/i18n best practices. Findings were produced by parallel sub-agents and spot-verified against source.

> This document **supersedes and merges** the two prior reports. It also reflects one executed change: **`@pack/rate-limit` was removed** (see §6). The earlier reports remain on disk for history.

---

## 1. Executive Summary

**Overall grade: B− → B (modern bones; the gaps are consistency, dependency currency, and dev-server tuning — not architecture).**

The codebase targets a genuinely modern baseline: Bun-native (`Bun.password`, `Bun.randomUUIDv7()`), strict TypeScript (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `moduleResolution: bundler`), uniform Svelte 5 runes, a cleanly layered Hono API free of `any`/`@ts-ignore`, a decoupled observability stack, and a verified two-tier test harness. That is above-average for a boilerplate.

Three things hold it back, and this analysis adds the two that the prior reports didn't cover:

1. **Consistency** (from the prior reports) — the `exports`-map convention is upheld by only ~half the packages; several validated config values are computed then discarded; a handful of unsound `as` escapes; modern resource-management (`using`) left on the table.
2. **Dependency currency & security** (§4) — a repo-wide update on **2026-06-16 resolved both CVEs** (`better-auth`, `hono`) and bumped the framework/tooling train. Remaining: `lucide-svelte` is still the **deprecated** package (needs a code migration, not a bump), `@tanstack/svelte-form` wasn't bumped, and `nodemailer` jumped a major (8→9, verify compat).
3. **Dashboard dev cold-start** (NEW, §5) — the 10–15s first-load is **Vite dev misconfiguration, not a Svelte limitation, and not i18n**. Fixable with `vite.config.ts` changes.

### Consolidated top priorities

| # | Priority | Why | Effort |
|---|---|---|---|
| ✅ | ~~Bump `better-auth` & `hono` past their CVE fixes~~ — **applied 2026-06-16** (now 1.6.19 / 4.12.25, §4) | Both CVEs patched. | done |
| ✅ | ~~Wire `BETTER_AUTH_SECRET` into `betterAuth({ secret })`~~ — **done** (auth e2e green) | Was validated then discarded. | done |
| ✅ | ~~Raise argon2 `memoryCost` 8129 → 19456~~ — **done** (OWASP argon2id baseline) | Embedded hash params → no migration. | done |
| ✅ | ~~e2e `DATABASE_URL`~~ — **reviewed**: kept unconditional `=` + documented; the `||=` recommendation was a misdiagnosis (Bun auto-loads a dev `.env`, so the override is required). | Already safe; guard is defense-in-depth. | done |
| ✅ | ~~Fix the broken `@pack/email` barrel~~ — **done** (relative specifiers + tsconfig base/jsx fix; package now typechecks) | Was broken on import. | done |
| ✅ | ~~Dashboard `vite.config.ts` perf~~ — **done** (cold render ~37s→~20-26s on a slow box; nested `>` form needed for transitive deps under the isolated linker) | The developer's daily pain. | done |
| ✅ | ~~Migrate `lucide-svelte` → `@lucide/svelte`~~ — **done** (4 files; lockfile unified on `@lucide/svelte@1.18.0`) | Removed the deprecated package. | done |
| ◐ | Add `exports` maps — **`@pack/db` + `@pack/tools` done**; `@pack/design-system` remaining (fiddly subpaths/CSS, §6 #8b) | Most-imported packages resolved only via filesystem fallback. | M |
| P2 | The remaining items in §3 and §6 | Strict-TS escapes, dead code, `using` adoption, convention drift. | S–L |

---

## 2. What the boilerplate is (descriptive state)

A Bun-native, Turbo-orchestrated monorepo: a **Hono API on Bun** (`apps/api`) and a **SvelteKit + Svelte 5 dashboard** (`apps/dashboard`), backed by **13 internal packages** (`@pack/*`) — down from 14 after `rate-limit` was removed.

| Layer | Choice |
|---|---|
| Runtime | Bun 1.3.14 (isolated linker, exact deps, catalog versions) |
| API | Hono on Bun, `buildApp()` factory, `bun build --compile` |
| Dashboard | SvelteKit, Svelte 5 runes, shadcn-svelte design system |
| DB | postgres.js + Drizzle ORM, drizzle-kit migrations, `Bun.randomUUIDv7()` IDs |
| Auth | better-auth (email+password), argon2id via `Bun.password` |
| Observability | Pino + OpenTelemetry SDK 2.x + `@sentry/bun` (decoupled topology) |
| Validation | Zod (shared `pack-env.ts` schema convention per package) |
| Containers | Dockerfile via dofigen; compose files (infra / observability / test) |

### Maturity scorecard (13 packages)

| Package | Maturity | `exports` map | tests | Notes |
|---|---|---|---|---|
| `observability` | **Mature** | ✅ (7 subpaths) | ✅ 30/30 | Reorganized `errors/logger/context/sentry/`; OTel 2.x + Sentry decoupled. Structure reference. |
| `i18n` | **Mature** | ✅ | ❌ | Locale resolution, lazy JSON dictionaries, Intl formatters, 3 locales. **Not** the dashboard perf cause (§5). |
| `design-system` | **Mature** | ❌ | ❌ | Largest: shadcn-svelte + bits-ui + OKLCH tokens. UI reference, but no `exports` map, mixed code styles. |
| `db` | **Mature** | ❌ | ❌ | postgres.js + Drizzle, migrations, seed. Missing `exports` map despite subpath imports. |
| `auth` | **Mature** | ✅ | ❌ | better-auth, argon2id via `@pack/tools`. `BETTER_AUTH_SECRET` validated-but-unwired. |
| `testing` | **Mature** | ✅ | ✅ | Bun preload + runner. |
| `email` | **Implemented** | ❌ (broken barrel) | ❌ | nodemailer + react-email. Barrel throws on import. |
| `tools` | **Implemented** | ❌ | ❌ | argon2 adapter, uuid-tail, string utils. No `exports`/`main`. |
| `seo` | **Implemented (orphaned)** | ✅ | ❌ | Metadata + JSON-LD. **Zero importers.** |
| `storage` | **Thin wrapper** | ❌ | ❌ | Passthrough of `@vercel/blob`; `BLOB_READ_WRITE_TOKEN` declared-but-unused. |
| `cache` | **Placeholder** | ❌ | ❌ | No `index.ts`. Only `pack-env` (hard-requires `REDIS_URL`) + deps. |
| `payments` | **Placeholder** | ❌ | ❌ | Only `package.json` + `tsconfig`. |
| `tsconfig` | **Mature** | n/a | n/a | `bun.json` + `svelte.json`. `svelte.json` weakens `noUncheckedIndexedAccess`. |

**API** (`apps/api`) — solid layering (`server.ts` → `buildApp()` → middleware → routes), complete `health→status/ready` migration, no `any`. Two-tier test harness: **unit 10/10** (no Docker, DI + `mock.module`), **e2e 7/7** (ephemeral tmpfs Postgres, real better-auth flow, truncate-per-test). Thin feature surface (the only `v1` endpoint, `stats`, is mock data). Loose ends: empty docker artifacts, `curl`-based healthcheck in the `oven/bun` base, `dofigen.yml` binds a phantom `packages/analytics`.

**Dashboard** (`apps/dashboard`) — small, clean, idiomatic Svelte 5; no Next.js leftovers; correct server/client split. Skeletal surface (4 of 5 sidebar links route to non-existent pages). Known rough edges: a triple-declared Stats contract whose Zod schema never executes, a duplicate `get-session` fetch ignoring `locals.user`, unsound `as string` FormData casts.

---

## 3. Code quality & language adequacy (prescriptive)

### 3a. ECMAScript (ES2023+)

- **`using` / `await using` + `Symbol.asyncDispose` — the biggest ES win.** The DB pool (`packages/db/index.ts` `disconnectDatabase`), OTel shutdown, and the e2e containers (`run.ts` try/finally) are textbook disposable lifecycles. Give `db` a `[Symbol.asyncDispose]` and let `await using` enforce teardown.
- **e2e `DATABASE_URL` override (resolved, not a bug)** — `apps/api/test/e2e/setup.ts:8` intentionally uses unconditional `=` (NOT `||=`): Bun auto-loads `packages/db/.env`, so the override is **required** to force the test DB; `||=` lets the dev value win and points e2e at the wrong DB. The `eco_test` check in `runMigrations()` is defense-in-depth. (The prior "use `||=`" recommendation was a misdiagnosis, caught by running the e2e suite.)
- **`??` vs `||` type-shape bug** — `apps/api/src/main/app.ts:28` `env.ORIGIN_ALLOWED || ['http://localhost:3000']` mixes a `string` LHS with a `string[]` fallback. Narrow `ORIGIN_ALLOWED` to an array in `pack-env`.
- **`Bun.sleep`** over the hand-rolled `new Promise(setTimeout)` in `graceful-shutdown.ts:45`.
- **`Array.at(-1)`** in `packages/tools/src/string/m-string.ts:96`.
- **Already modern (credit):** `Bun.randomUUIDv7()`, `AbortSignal.timeout`, `Bun.password` (argon2id), uniform Svelte 5 runes + `$app/state`, `error cause` where present.

### 3b. TypeScript (strict, 6.x)

The base config is strong; the defects are **local escapes** from it.

- **`satisfies` over untyped literals** — `observability/logger/index.ts:25` (`satisfies pino.LoggerOptions` would catch the vestigial `requestId`/`path` pretty fields), `sentry/index.ts:12–16` (replace `as string | undefined` casts).
- **Replace `as` with narrowing** — the dashboard `data.get(x) as string` FormData casts (sign-in/sign-up actions, 5×), `apps/api/src/core/env.ts:27` `('local' as string)`, the repeated `as ContentfulStatusCode` (error-handler `67,83,114` + `openapi/utils.ts:54` → one `toStatusCode()` helper), `safe-fetch.ts` `body as T` (validate with the existing Zod schema or stop pretending it validates).
- **`noUncheckedIndexedAccess` weakening** — `packages/tsconfig/svelte.json:12` sets it `false`, silently weakening `i18n`/`seo`/`design-system`/dashboard. `i18n/index.ts:16,44` `dictionaries['en']()` compiles only because of this. Remove the override and handle the `undefined`.
- **`isolatedModules`** — present in `svelte.json`, absent in `bun.json`; add it to pair with `verbatimModuleSyntax`.

### 3c. Bun 1.3.x native

- **DO** — `@pack/cache` → `Bun.redis` (it's an empty placeholder declaring `ioredis`); `Bun.sleep` in graceful-shutdown; `Bun.file` for `@pack/email` template reads.
- **EVALUATE** — `@pack/storage`: `Bun.s3` vs `@vercel/blob` (today a passthrough with a dead token). If Vercel Blob is required, at least delete the unused `BLOB_READ_WRITE_TOKEN`.
- **CAREFUL — keep Drizzle.** `Bun.sql` is not a replacement for an ORM + migration toolchain. The only DB lever worth benchmarking is `prepare: true` for the long-running API (`db/index.ts:16`, the inline comment already recommends it).
- **SKIP** — `Bun.serve({ routes })` over Hono: Hono provides middleware/OpenAPI/validation that the raw router doesn't.

### 3d. Structural / morphological

- **`exports` maps not upheld** — the highest structural debt. Copy `observability/package.json:10–18` to `@pack/tools`, `@pack/design-system`, `@pack/db`. Today `@pack/db/schema` and `@pack/db/pack-env` resolve only via Bun's filesystem fallback.
- **Naming** — `MString.capitalize()` is actually `toTitleCase`; `MString.valueOf(): string` is a coercion footgun (drop it); mixed PT/EN comments in `m-string.ts`.
- **Dead / orphaned** — `observability/errors/parse-error.ts` (zero callers; drags the pino/OTel graph into the `errors` subpath; logs at error on every parse — delete); `@pack/seo` (orphaned); `@pack/payments` + `@pack/cache` (placeholders); unused deps (`resend` in email, the decorative tokens).
- **Barrel correctness** — `@pack/email/index.ts` bare specifier + phantom export (P1); `@pack/i18n` redundant `./utils` subpath.
- **Code-style drift** — `@pack/design-system` mixes tabs/double-quote/`.js`-ext (shadcn-generated) with 2-space/single-quote (hand-authored) — even within `lib/utils.ts`. Biome isn't normalizing the generated dirs.
- **Convention drift** — `db` throws bare `Error` vs `AppError` elsewhere; `db`/`auth` have no `test` script; `stringbool({truthy,falsy})` duplicated in two `pack-env.ts`; `setup.timezone()` is a no-op stub.

---

## 4. Dependency currency & security (UPDATED 2026-06-16)

A repo-wide dependency update was applied on **2026-06-16**; the table below reflects **post-update state**. The update **resolved both CVEs** flagged in the prior analysis (`better-auth`, `hono`) and advanced the framework/tooling train. Three things still need action: `lucide-svelte` is still the **deprecated** package (a *code* migration, not a bump — §5e), `@tanstack/svelte-form` was **not** bumped, and `nodemailer` jumped a **major** (8 → 9) that should be compatibility-checked.

| Package | Pinned (now) | Was | Status | Note | Action |
|---|---|---|---|---|---|
| **better-auth** | 1.6.19 | 1.6.9 | ✅ patched | CVE-2026-45337 (`deviceAuthorization` ownership) fixed in 1.6.11 — **now clear**. | ✅ done |
| **hono** | 4.12.25 | 4.12.18 | ✅ patched | CVE-2026-47673 (JWT scheme) + CVE-2026-47674 (ip-restriction IPv6) fixed in 4.12.21 — **now clear**. | ✅ done |
| **lucide-svelte** (dashboard) | 1.0.1 | 1.0.1 | ⛔ deprecated | UNCHANGED — the package is abandoned; the dashboard still imports it. | **migrate → `@lucide/svelte`** (code change, §5e) |
| **@lucide/svelte** (design-system) | 1.18.0 | 1.14.0 | ✅ current | The maintained lucide package — now latest. | ✅ done |
| **nodemailer** | 9.0.0 | 8.0.7 | ⚠ major bump | Jumped to the new major; v9 raises the Node baseline and changes some API. | **verify `@pack/email` compat** |
| **@tanstack/svelte-form** | 1.28.5 | 1.28.5 | ⚠ behind | The one frontend dep left behind (latest ~1.33); no advisory. | minor-bump |
| **@sveltejs/kit** | 2.65.1 | 2.59.1 | ✅ current | Bugfix train. | ✅ done |
| **vite** | 8.0.16 | 8.0.11 | ✅ current | Vite 8 (Rolldown-default). | ✅ done |
| **svelte** | 5.56.3 | 5.55.5 | ✅ current | — | ✅ done |
| **@sentry/bun** | 10.58.0 | 10.56.0 | ✅ current | Bun custom-OTel docs incomplete; `skipOpenTelemetrySetup` absent in the Bun SDK. | ✅ done |
| **OTel SDK** | 2.8.0 (trace/metrics/resources); exporters 0.219.0; host-metrics 0.39.0 | 2.7.1 / 0.218.0 / 0.38.3 | ✅ current | `@opentelemetry/api` stays 1.9.1. | ✅ done |
| **turbo** | 2.9.18 | 2.9.11 | ✅ current | — | ✅ done |
| **@biomejs/biome** | 2.5.0 | 2.4.14 | ✅ current | — | ✅ done |
| **tailwind v4 stack** | 4.3.1 (core/vite/postcss); typography 0.5.20; tailwind-merge 3.6.0 | 4.3.0 / 0.5.19 / 3.5.0 | ✅ current | Use `@tailwindcss/vite` (already done). | ✅ done |
| **@hono/zod-openapi / @scalar/hono-api-reference** | 1.4.0 / 0.11.3 | 1.3.0 / 0.10.14 | ✅ current | API-docs stack. | ✅ done |
| **drizzle-orm / drizzle-kit / postgres** | 0.45.2 / 0.31.10 / 3.4.9 | = | ✅ current | Keep orm/kit aligned to avoid skew errors. | keep |
| **zod** | 4.4.3 | = | ✅ current | Stable (v4). | keep |
| **pino / pino-pretty** | 10.3.1 / 13.1.3 | = | ✅ current | Bun caveat below. | keep |
| **bits-ui / mode-watcher / class-variance-authority** | 2.18.1 / 1.1.0 / 0.7.1 | = | ✅ current | — | keep |
| **typescript** | 6.0.3 | = | ✅ current | Last JS-based TS; 7.0 is the Go-native rewrite — plan a future migration. | keep |
| **react / react-dom** (email) | 19.2.7 | 19.2.6 | ✅ current | — | ✅ done |

(Also bumped, minor: `es-toolkit` 1.46.1→1.47.1, `postcss` 8.5.14→8.5.15, `@internationalized/date` 3.12.1→3.12.2, `@formatjs/intl-localematcher` 0.8.6→0.8.10, `@vercel/blob` 2.3.3→2.4.0, `ws` 8.20.0→8.21.0, `resend` 6.12.3→6.12.4, assorted `@types/*`; `concurrently` 9→10 in apps/api. The `@pack/cache` placeholder's `bullmq`/`ioredis` were bumped too — moot until that package is implemented or replaced by `Bun.redis` per §3c.)

**What the update resolved:** both flagged CVEs (better-auth, hono) plus the kit / vite / svelte / sentry / OTel / biome / turbo / tailwind bumps from the prior action list. **What still needs action:** the `lucide-svelte` → `@lucide/svelte` migration (a code change, §5e), the `@tanstack/svelte-form` bump, and a **nodemailer 9 compatibility check** for `@pack/email` (whose barrel is broken anyway — §3d/§6).

**Runtime-combo gotchas (unchanged — document for downstream):**

- **OTel SDK 2.x + Bun** — auto-instrumentation (http/express/fastify) is flaky on Bun; initialize OTel **programmatically** (no `--require`/preload). The repo already does manual instrumentation, which is correct.
- **pino + Bun** — worker-thread transports may not resolve at runtime without bundling; keep `pino-pretty` dev-only. The dashboard's `ssr.external: ['pino','pino-pretty','thread-stream']` handling is correct — **keep it**.
- **Tailwind v4 + SvelteKit** — use `@tailwindcss/vite` (already done), not PostCSS.
- **zod 4** — `.passthrough/.strict/.strip` deprecated and `z.input/z.output` type changes vs zod 3; relevant when downstream copies schemas.

---

## 5. Dashboard dev cold-start + i18n (NEW deep-dive)

**The symptom:** ~10–15s before dashboard pages render on the first request after `vite dev`; fast afterward; the cycle **repeats after every `Ctrl+C` + restart**. The developer (coming from Next.js, where the first compile is ~30s then cached) suspected `@pack/i18n` "loads too much."

### 5a. Verdict

- **i18n is a red herring.** The three dictionaries total **8.6 KB** (`en` 2748 + `pt` 2855 + `es` 3019 bytes) and are loaded **lazily, one at a time**, via `getDictionary(locale)` → `import('./dictionaries/${locale}.json')`. Nothing imports all three eagerly; the i18n barrel exports only small pure functions. i18n is **well under 1%** of the delay.
- **It's misconfiguration, not a Svelte 5 limitation.** The cost is Vite **dev** dependency-optimization + first-time on-demand SSR/Svelte transform. The Next.js mental model is the trap: Next persists compiled output across restarts; Vite persists only the esbuild **client** prebundle (`node_modules/.vite`), never the **SSR transform graph** — so the SSR transform cost is structurally re-paid on every cold start. 10–15s is *pathological* for an app this size (normal is low single digits); it points squarely at config.

### 5b. Ranked root causes (both sub-agents converged)

1. **Mid-flight client dep re-optimization (largest slice).** `optimizeDeps.include` lists only the *directly* imported `['lucide-svelte','mode-watcher','zod']`. The heavy client deps arrive **transitively through the workspace package `@pack/design-system`** (which has no `dist`/`exports`, so Vite treats it as source and can't pre-scan into it): `bits-ui` (5 MB, 226 `.svelte` + 260 `.js`, a 41-namespace barrel), `@lucide/svelte`, `tailwind-variants`, `tailwind-merge`, `clsx`. On a cold `.vite`, Vite discovers these on the **first browser request**, re-bundles, and forces a **full-page reload** ("new dependencies optimized, reloading") — the visible stall. (Proof: the warm `_metadata.json` already lists all of them, yet none are in `optimizeDeps.include` — they were late-discovered on a prior run.)
2. **First-request SSR + Svelte compile of the design-system tree (re-paid every restart).** The authenticated layout reaches dozens of the design-system's ~85 `.svelte` components + bits-ui; each is compiled on first touch (SSR + client passes), single-threaded through Vite's transform. This is the genuine "first compile is slow" floor — bounded, one-time per restart.
3. **No `server.warmup`.** Without it, #1 and #2 land on the first real request instead of being pre-warmed during server boot.
4. **`.vite` cache invalidation between sessions.** `bun.lock` mtime (2026-06-07) is newer than the cache `_metadata.json` (2026-05-09); Vite hashes the lockfile into the cache key, so any `bun install` / `clean:hard` between sessions forces a full re-optimize → explains "repeats every restart."
5. **`ssr.noExternal: ['lucide-svelte']` — rationale is backwards.** The in-code comment ("so the 1k+ icon files don't get transformed individually") is a *production-build* rationale misapplied to **dev**. In dev, externalizing is what keeps SSR fast; `noExternal` forces lucide's modules **through** Vite's SSR transform on every cold start. The dashboard already uses deep per-icon imports (`lucide-svelte/icons/...`), so the barrel problem it's guarding against doesn't exist here. Low magnitude but it's *cost, not savings*.
6. **Tailwind v4 first scan** — minor (~3–8%).

### 5c. Concrete fixes (`apps/dashboard/vite.config.ts`)

```ts
export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), sveltekit(), process.env.ANALYZE === '1' && bundleStats()],
  server: {
    port: 3000,
    // FIX B — pre-transform the heavy layout/sidebar tree at boot so it's off
    // the first-request critical path. Dev-only.
    warmup: {
      ssrFiles: [
        './src/routes/+layout.svelte',
        './src/routes/[locale]/+layout.svelte',
        './src/routes/[locale]/(authenticated)/+layout.svelte',
        './src/lib/components/sidebar/app-sidebar.svelte',
      ],
      clientFiles: [
        './src/routes/+layout.svelte',
        './src/routes/[locale]/(authenticated)/+layout.svelte',
      ],
    },
  },
  ssr: {
    // FIX C — gate the lucide noExternal to BUILD only (in dev, externalizing
    // keeps SSR cold-start fast). Keep pino external in both — worker-thread
    // resolution breaks under bundling.
    noExternal: command === 'build' ? ['lucide-svelte'] : [],
    external: ['pino', 'pino-pretty', 'thread-stream'],
  },
  optimizeDeps: {
    // FIX A — pre-bundle the transitive client deps that arrive via the
    // @pack/design-system workspace package, so Vite doesn't discover them
    // mid-request and force a reload. Glob covers per-icon deep imports.
    include: [
      'lucide-svelte', 'lucide-svelte/icons/*',
      'mode-watcher', 'zod',
      'bits-ui',
      '@lucide/svelte', '@lucide/svelte/icons/*',
      'tailwind-variants', 'tailwind-merge', 'clsx',
    ],
  },
}));
```

Plus:
- **FIX D — stabilize the cache:** don't run `bun install` / `clean:hard` between dev sessions unless deps changed (a newer lockfile guarantees a full re-optimize). The `clean` script already preserves `.vite`; document that `clean:hard` forces a cold start.
- **FIX E — unify icons on `@lucide/svelte` with deep imports.** Migrate the dashboard off the deprecated `lucide-svelte@1.0.1` (§4) and convert the one barrel import in `@pack/design-system` (`@lucide/svelte/icons`) to deep per-icon paths.

**Expected impact:** FIX A + FIX B together should cut the cold first-render from ~10–15s to ~2–4s (the irreducible Svelte-compile + Tailwind-scan floor). FIX D removes the "repeats every restart" surprise. **None of this affects production** — `vite build` does the work once at build time.

**Measure it:** reproduce with `cd apps/dashboard && rm -rf node_modules/.vite && time bun run dev`, then watch for the `optimized dependencies changed. reloading` line after the first request (confirms #1). Use the existing `bun run debug` (`DEBUG=vite:deps,vite:transform,vite:resolve`) to see the prebundle set and which files dominate the transform; re-run after the fixes to confirm the re-optimize pass disappears.

**Implemented (2026-06-16):** applied in `vite.config.ts`. Two real-world deltas vs the snippet above, found by measuring: (1) under Bun's isolated linker the transitive deps (`bits-ui`, `tailwind-variants`, `@lucide/svelte`, …) do **not** resolve from the dashboard root as bare include entries — they use the nested `@pack/design-system > dep` form (resolve in the parent's context); (2) the `*/icons/*` globs are **kept** — dropping them regressed the cold render (~19s → ~33s in testing). Measured cold first-render on a slow sandbox: baseline ~37s → ~20-26s with the fix. Prod `vite build` verified (17.7s, adapter-node). Sandbox numbers are noisy (~2.5× slower than the dev's box) — validate locally where baseline is ~10-15s.

### 5d. i18n strategy (boilerplate-level, separate from the perf fix)

The custom dynamic-import-JSON approach is **fine and not the perf cause**, but for a boilerplate it has two real limits: **no message-level tree-shaking** (the whole per-locale dictionary ships even if a page uses 3 keys) and **no compile-time key typing** (a `dict.some.key` typo fails silently). The mainstream alternatives:

- **Paraglide JS / inlang** — compiler-first; messages compile to typed, tree-shakable ESM functions. Best bundle-size + type-safety story for SvelteKit; the project already has an `ANALYZE` bundle-stats plugin, so it cares about size.
- **typesafe-i18n** — tiny runtime, fully typed, plural/gender rules; a familiar dictionary model with type-safety.

Also verify these edge cases the custom impl may miss: `<html lang={locale}>` set from the route param, `hreflang`/per-locale canonical links (SEO), and passing the loaded dictionary through `load` data (not fetched again in a component) to avoid SSR+CSR double-loading. **Recommendation:** keep the current approach short-term; for the boilerplate default, prefer **Paraglide JS** (size + typing) or **typesafe-i18n** (typing with a runtime model).

---

## 6. Consolidated prioritized action table

Severity: **Critical** / **High** / Medium / Low. Effort: S (<30 min) / M (hours) / L (day+). Done items struck through.

| # | Area | Location | Sev | Eff | Fix |
|---|---|---|---|---|---|
| — | packages | `packages/rate-limit/` | — | — | ~~Remove the package~~ **DONE** — directory deleted, lockfile refreshed. |
| ~~1~~ | security | `better-auth`, `hono` | ✅ | — | ~~Bump past CVE fixes~~ **DONE 2026-06-16** — better-auth 1.6.19, hono 4.12.25. |
| ~~2~~ | auth | `packages/auth/server.ts` | ✅ | — | ~~Pass `secret`~~ **DONE** — `secret: env.BETTER_AUTH_SECRET` wired; auth e2e green. |
| ~~3~~ | security | `packages/tools/src/crypto/argon2-adapter.ts:9` | ✅ | — | ~~memoryCost~~ **DONE** — 8129 → 19456 (OWASP argon2id baseline). |
| ~~4~~ | test safety | `apps/api/test/e2e/setup.ts:8` | ✅ | — | **REVIEWED** — kept unconditional `=` (Bun auto-loads a dev `.env`; override required) + documented; `||=` was a misdiagnosis. Guard is defense-in-depth. |
| ~~5~~ | dev perf | `apps/dashboard/vite.config.ts` | ✅ | — | **DONE** — `optimizeDeps.include` (transitive via `@pack/design-system > dep` + `*/icons/*` globs), `server.warmup`, `ssr.noExternal` gated to build. Cold first-render ~37s→~20-26s on a slow box; prod build verified (17.7s). |
| ~~6~~ | deps | `lucide-svelte` (dashboard) | ✅ | — | **DONE** — 4 files migrated to `@lucide/svelte/icons/*`; dashboard dep + catalog swapped; vite.config updated; lockfile unified on `@lucide/svelte@1.18.0` (lucide-svelte gone). Prod build verified (13.8s). |
| ~~7~~ | email | `packages/email/index.ts` + `tsconfig.json` | ✅ | — | **DONE** — relative specifiers (`./send`, `./templates/contact`); tsconfig → `bun.json` base + `jsx: react-jsx` + broadened include; package now typechecks. |
| ~~8a~~ | module boundaries | `packages/{db,tools}/package.json` | ✅ | — | **DONE** — `exports` maps added (db: `.`/`./schema`/`./pack-env`; tools: `.`). Verified: tsc (auth/db/tools/api) + runtime subpath resolution + e2e 7/7. |
| 8b | module boundaries | `packages/design-system/package.json` | **High** | M | Add `exports` map — fiddly (many subpaths + `.svelte`/`.css` + wildcards); its own slice. |
| ~~9~~ | ts strictness | `packages/tsconfig/svelte.json` | ✅ | — | **DONE** — removed the `noUncheckedIndexedAccess:false` override (+ the redundant re-declarations; svelte.json now only adds the DOM `lib`). Consumers (`auth`/`observability`/`i18n`) clean after fixing 4 `i18n` errors — `getDictionary` rewritten to a typed `loadDictionary(locale: Locale)` (also kills the double-fallback) + `format.ts` `?? 'USD'`. Dashboard svelte-check still 0/0/0. |
| ~~10~~ | dead code | `packages/observability/errors/parse-error.ts` | ✅ | — | **DONE** — deleted + removed from barrel (0 callers confirmed). Verified: obs tsc + 30/30 tests + api tsc. |
| ~~11~~ | type soundness | dashboard `sign-in,sign-up/+page.server.ts` | ✅ | — | **DONE** — 5× `data.get(x) as string` → `typeof`-narrowing (rejects `File`/null, not just empty). Verified: svelte-check 0 errors in both files. |
| ~~12~~ | type soundness | `apps/dashboard/src/lib/api/safe-fetch.ts` | ✅ | — | **DONE** — `safeFetch` takes an optional `schema?: ZodType<T>` and runs `schema.parse(body)` at the boundary; `+page.server.ts` now passes `StatsSchema` (was declared but never executed). `failure()` reads `res.json()` as `unknown` + narrows. Verified: svelte-check 0/0/0. |
| ~~13~~ | deps | `@sveltejs/kit`, `vite` | ✅ | — | ~~Bump~~ **DONE 2026-06-16** — kit 2.65.1, vite 8.0.16. |
| 13b | deps | `nodemailer` 9.0.0 (`packages/email`) | ✅ (type) | — | Type-compat verified — `@pack/email` typechecks against nodemailer 9 (`createTransport`/`sendMail`). Runtime send not exercised (no SMTP in tests; `shouldSendEmail` is false outside prod/dev). |
| 13c | deps | `@tanstack/svelte-form` 1.28.5 | Low | S | Not bumped in the 2026-06-16 update; ~5 minors behind. Optional minor-bump. |
| 14 | ES lifecycle | `packages/db/index.ts` + `graceful-shutdown.ts:45` | Medium | M | `Bun.sleep`; add `[Symbol.asyncDispose]`; adopt `await using` in shutdown + e2e containers. |
| ~~15~~ | cache | `packages/cache/*` | ✅ | — | **DONE** — implemented with native `Bun.RedisClient` (dropped `bullmq`/`ioredis`): typed JSON helpers (`cacheGet/Set/Del/Has/Remember`), TTL via `SET … EX`, `disconnectCache()`; added exports map + tsconfig. `REDIS_URL` kept required (real package now; only imported when cache is used). Verified: tsc against `@types/bun` 1.3.14. Runtime tests need a Redis instance (deferred, like the e2e DB tier). |
| 16 | ts | error-handler `67,83,114` + `openapi/utils.ts:54` | ⊘ defer | — | **Deferred (cosmetic)** — the 4 `as ContentfulStatusCode` casts are honest, localized assertions of known-valid status numbers; a `toStatusCode` wrapper just re-casts (no validation) → indirection without safety. Revisit only if `AppError.statusCode` is retyped upstream. |
| ~~17~~ | ts | `apps/api/src/core/env.ts` | ✅ | — | **DONE** — widened via `const nodeEnv: string` for all three checks; dropped `('local' as string)`. |
| ~~18~~ | ts | `apps/api/src/main/app.ts` | ✅ | — | **DONE** — premise corrected: `ORIGIN_ALLOWED` is *already* required `string[]` (auth pack-env `.transform()`), so the `|| [...]` fallback was dead (arrays are truthy). Removed it. |
| ~~19~~ | ts | `observability/logger/index.ts`, `sentry/index.ts` | ✅ | — | **DONE** — `loggerOptions … satisfies LoggerOptions`; Sentry casts → `asTag()` narrowing helper. **Did NOT** remove the pretty `requestId`/`path` fields — they are the **live dashboard logging bridge** (`hooks.server.ts`), not vestigial (analysis was wrong on that). |
| ~~20~~ | naming | `packages/tools/src/string/m-string.ts` | ✅ | — | **DONE** — `capitalize`→`toTitleCase`, dropped `valueOf` (coercion footgun), `names.at(-1)`, PT→EN comments. Safe: zero callers (the string util is unused). |
| ~~21~~ | ts config | `packages/tsconfig/bun.json` | ✅ | — | **DONE** — added `isolatedModules: true`. All bun.json consumers (observability/db/tools/auth/email/testing/api) clean (verbatimModuleSyntax already covered it). |
| 33 | tooling | `packages/design-system` | Medium | S | **Found during #9** — its `typecheck` is `tsc --noEmit`, which **can't** typecheck Svelte named exports (`TS2614 Module '"*.svelte"' has no exported member`). It needs `svelte-check` (like the dashboard, #32). Pre-existing; unrelated to #9/#21. |
| 22 | i18n (boilerplate) | `@pack/i18n` + dashboard | Medium | L | Evaluate Paraglide JS / typesafe-i18n; ensure `<html lang>`, hreflang, dictionary-via-`load` (§5d). |
| 23 | convention | `packages/db/index.ts:36` | ⊘ defer | — | **Deferred** — premise weak: `@pack/db` doesn't depend on `@pack/observability` (nor do `auth`/`tools`/`email`), so "match other packages" overstates. Adding the dep just to throw `AppError` in one disconnect path is coupling for marginal gain; bare `Error` + `{ cause }` is fine here. |
| 24 | tests | `packages/{db,auth}/package.json` | Low | M | Add `"test"` script + unit tests (argon2 adapter, db guard). |
| 25 | storage | `packages/storage/*` | Low | M | Evaluate `Bun.s3` vs `@vercel/blob`; delete unused `BLOB_READ_WRITE_TOKEN`. |
| 26 | dead code | `packages/seo/*` | Low | M | Wire into dashboard or remove from build; drop the cast-enabling index signature. |
| 27 | dead code | `apps/api/src/main/setup.ts:6` | Low | S | Implement `timezone()` or remove the no-op stub. |
| 28 | DRY | `observability/pack-env.ts` + `db/pack-env.ts` | ⊘ defer | — | **Deferred** — the duplication is a one-line `stringbool({truthy,falsy})` config literal; hoisting it to a shared helper means adding a `@pack/tools` (+ zod) dep edge to `observability`/`db` for marginal DRY. Not worth the coupling. |
| 29 | style | `packages/design-system/**` | Low | M | Configure Biome to format/quarantine generated dirs. |
| 30 | perf | `packages/db/index.ts:16` | Low | S | Benchmark `prepare: true` for the long-running API. |
| 31 | infra | `apps/api/dofigen.yml` | Low | S | Remove the phantom `packages/analytics` bind; fix the `curl` healthcheck; populate/delete empty docker artifacts. |
| ~~32~~ | tooling | `apps/dashboard` | ✅ | — | **DONE** — added `svelte-check@4.6.0` devDep (typecheck script was exit 127); fixed the real `asChild` type error in `user-avatar.svelte` (→ `child` snippet only, bits-ui 2.x); `biome --write` on `auth-proxy.ts` + `+error.svelte`. Dashboard now **typecheck 0/0/0 + biome clean**. |

---

### Closing note

The architecture is sound; the work is **finishing and tightening**, not redesign. The new findings shift the top of the list: the **security bumps (#1)** and the **dashboard dev-perf config (#5)** now sit alongside the earlier criticals, because a boilerplate's pinned deps and developer experience are first-class — they propagate to every project built from it. The dashboard's 10–15s pain has a concrete, low-effort fix and is explicitly *not* an i18n or framework problem. Items #1–#12 are mostly S/M effort and remove every genuinely dangerous or daily-painful gap.
