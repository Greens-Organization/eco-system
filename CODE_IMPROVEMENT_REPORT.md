# Code Improvement Report — `eco-system` v2 Boilerplate

**Scope:** language-level adequacy to modern standards — ECMAScript (ES2023+), TypeScript (strict, 6.x), and Bun 1.3.x native capabilities.
**Branch:** `alpha/eco-system-v2` · **Runtime:** Bun 1.3.14 pinned · **Lint:** Biome 2.4.14 · **Build:** Turbo 2.9.11 · **TS:** 6.0.3
**Method:** consolidated findings from 6 investigation agents, spot-verified against source. Every file:line below was read or grepped during this pass.

---

## 1. Executive Summary

**Overall grade: B− (solid bones, modern target, but conventions not yet uniformly upheld).**

The codebase aims at a genuinely modern baseline — Bun-native `Bun.password`, `Bun.randomUUIDv7()`, `AbortSignal.timeout`, Svelte 5 runes everywhere, a strict tsconfig with `noUncheckedIndexedAccess` + `verbatimModuleSyntax` + `moduleResolution: bundler`. The API app is cleanly layered and free of `any`/`@ts-ignore`. This is above-average for a boilerplate.

The gap is **consistency**, not capability. The two most-imported packages (`@pack/tools`, `@pack/design-system`) lack `exports` maps while two lesser packages (`@pack/i18n`, `@pack/seo`) have them — so the "reference pattern" is the exception, not the rule. Several validated config values are computed and then thrown away (`BETTER_AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`). Modern ES resource-management (`using` / `Symbol.asyncDispose`) is absent precisely where it would pay off (DB pool, OTel, e2e containers).

### Highest-leverage improvements (do these first)

1. **Add `exports` maps to `@pack/tools` and `@pack/design-system`** (and the 5 thin packages). Currently resolve only via Bun's filesystem fallback — brittle, non-portable, breaks any non-Bun consumer or future `tsup` build. *(verified: neither has `exports`)*
2. **Wire `BETTER_AUTH_SECRET` into `betterAuth({ secret: ... })`** — `packages/auth/server.ts` validates it in pack-env but never passes it; works only by better-auth's silent `process.env` fallback. *(verified: no `secret:` key in the config object)*
3. **Fix the e2e `DATABASE_URL` safety hole** — `apps/api/test/e2e/setup.ts:8` assigns with plain `=`, so the `eco_test` guard at line 45 can never see an external override. Use `||=` like every other var two lines below. *(verified)*
4. **Fix the broken email barrel** — `packages/email/index.ts` does `export * from 'send'` (bare specifier) and `export * from 'templates/contact'` (file does not exist). The package throws on import. *(verified)*
5. **Correct the argon2 `memoryCost: 8129`** in `packages/tools/src/crypto/argon2-adapter.ts:9` — non-power-of-two, ~8 MiB, well under the OWASP argon2id 19 MiB (`19456`) baseline. Almost certainly a typo for `8192`; should be raised to `19456`. *(verified: value is literally `8129`)*
6. **Delete dead code:** `packages/observability/errors/parse-error.ts` (zero callers; drags the pino/OTel graph into the `errors` subpath and logs at error on every "parse"). *(verified: still imports `../logger` and calls `log.error`)*
7. **Adopt `using` / `await using`** for the DB pool, OTel shutdown, and e2e containers — turns hand-rolled try/finally teardown into language-enforced lifecycles.
8. **Add `noUncheckedIndexedAccess: true` to `packages/tsconfig/svelte.json`** (or remove the override) — it currently sets it `false`, silently weakening `@pack/i18n`, `@pack/seo`, `@pack/design-system` and the dashboard. *(verified)*

---

## 2. Language Adequacy — ECMAScript (ES2023+)

### 2a. `using` / `await using` + `Symbol.dispose` / `Symbol.asyncDispose` — the biggest ES win

The repo manually manages several async resource lifecycles with try/finally or imperative teardown. These are textbook `await using` candidates (TS 5.2+, Bun supports the disposal protocol natively).

- **`apps/api/src/main/infra/graceful-shutdown.ts`** — `shutdown()` (lines 29–68) imperatively `server.stop()` → `await disconnectDatabase()` → `await shutdownObservability()`, each wrapped in logging, with a manual `clearTimeout`. This is a disposal stack. Define `[Symbol.asyncDispose]` on the DB and observability handles and let an ordered teardown run them. At minimum, the inner grace-period sleep (lines 45–47) — a hand-built `new Promise(resolve => setTimeout(resolve, gracePeriod))` — should be `await Bun.sleep(options.gracePeriod)`. *(verified: the `new Promise`/`setTimeout` sleep is present at 45–47)*

- **`packages/db/index.ts`** — `disconnectDatabase()` (30–38) is effectively a disposer for the `postgres` pool. Add:
  ```ts
  export const db = Object.assign(drizzle({ client, schema, ... }), {
    async [Symbol.asyncDispose]() { await client.end(); },
  });
  ```
  so consumers can `await using database = db`. The existing function can delegate to it. *(verified: `await db.$client.end()` in a try/catch)*

- **e2e `containers.ts` / `run.ts`** (testcontainers) — container start/stop is the canonical `await using` example. Each container is a disposable; the harness should not need manual `.stop()` in finally.

- **`@pack/email` SMTP transporter, `@pack/rate-limit` Redis client, `@pack/cache` Redis** — module-load singletons (see §5). If they become factory-created, give them `Symbol.asyncDispose` so request- or test-scoped clients self-close.

### 2b. Logical assignment (`||=` / `??=`) and `??` vs `||`

- **`apps/api/test/e2e/setup.ts:8`** — `process.env.DATABASE_URL = '...eco_test'` uses plain `=`. The lines immediately below (`BETTER_AUTH_SECRET ||=`, `BETTER_AUTH_URL ||=`, `ORIGIN_ALLOWED ||=`) already use `||=`. The inconsistency is the bug: the `eco_test` guard at line 45 is decorative because the URL is unconditionally overwritten. **Fix: `||=`.** *(verified — exact inconsistency reproduced)*

- **`apps/api/src/main/app.ts:28`** — `env.ORIGIN_ALLOWED || ['http://localhost:3000']` mixes a `string` LHS with a `string[]` fallback. This is a type-shape bug, not just a `||` vs `??` nit — narrow `ORIGIN_ALLOWED` to an array (split/transform in pack-env) so the fallback type matches. *(verified)*

### 2c. Error `cause` consistency

- **`packages/db/index.ts:36`** — `throw new Error('Failed to disconnect database', { cause: error })` correctly uses `cause` (good ES2022 usage) **but** throws a bare `Error` while every other package throws `AppError`/`BaseError`. Convention drift, not an ES defect — align the *type*, keep the `cause`. *(verified)*
- `cause` is used well where present; the gap is uniformity, not syntax.

### 2d. `Array.at`, `Object.hasOwn`, `Promise.withResolvers`, `structuredClone`

- **`packages/tools/src/string/m-string.ts:96`** — `names[names.length - 1]?.[0]` is the idiom `Array.prototype.at(-1)` was designed to replace: `names.at(-1)?.[0]`. Minor, but it's a utility lib and should model the idiom. *(verified)*
- **`safe-fetch.ts` `json?.message ?? json?.error`** — fine, but `json` is `any` (see §3); once typed, prefer `Object.hasOwn(json, 'message')` over truthy chaining if the shape is a record.
- `Promise.withResolvers()` would clean up any hand-built `let resolve; new Promise(r => resolve = r)` deferred patterns — none egregious found, but worth knowing for the shutdown grace-period rewrite.

### 2e. Where the code is already modern (credit where due)

- `Bun.randomUUIDv7()` for DB IDs — correct, monotonic, no `uuid` dep. ✅
- `AbortSignal.timeout` usage in fetch paths — modern, no manual `AbortController` plumbing. ✅
- `Bun.password` (argon2id) for auth hashing — native, no `argon2` native addon. ✅ (value aside, §1.5)
- Svelte 5 runes (`$state`/`$derived`/`$props`/`$derived.by`) uniformly across the dashboard, with `$app/state` not the deprecated `$app/stores`. ✅
- `import.meta`-based resolution and top-level `await`-friendly ESM throughout (`"module": "Preserve"`). ✅

---

## 3. Language Adequacy — TypeScript (strict, 6.x)

The tsconfig base is strong: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noImplicitOverride`, `moduleResolution: bundler`, `target/module: ESNext/Preserve`. The defects are *local escapes* from that strictness.

### 3a. `satisfies` over untyped literals / casts

- **`packages/observability/logger/index.ts:25`** — `loggerOptions` is a bare object literal. Apply `satisfies pino.LoggerOptions` so excess/typo'd keys (the vestigial `requestId`/`path` pretty fields at 58–61) fail to compile instead of being silently ignored.
- **`packages/observability/sentry/index.ts:12–16`** — `as string | undefined` casts off a `Record<string, unknown>`. Replace with a typed config parse (`satisfies Sentry.BunOptions` after a zod/narrowing step), not assertions.

### 3b. Replace `as` / `as unknown as` / `as string` with narrowing

- **`apps/dashboard/.../sign-in/+page.server.ts:23–24` and `sign-up/+page.server.ts:22–24`** — `data.get('email') as string`. `FormData.get` returns `FormDataEntryValue | null`; the cast is unsound (a file upload or missing field is silently `string`). Narrow:
  ```ts
  const email = data.get('email');
  if (typeof email !== 'string') return fail(400, { error: 'invalid' });
  ```
  Or run the FormData through a zod schema (the dashboard already depends on zod). *(verified: 5 such casts across the two actions)*
- **`apps/api/src/core/env.ts:27`** — `process.env.NODE_ENV === ('local' as string)`. The `as string` exists only to dodge literal narrowing against the `'development' | 'production' | ...` union. Add `'local'` to the env enum in pack-env instead of casting it in at the comparison site. *(verified)*
- **`apps/api/src/main/infra/error-handler.ts:67,83,114`** + **`openapi/utils.ts:54`** — repeated `as ContentfulStatusCode`. Centralize one typed helper `toStatusCode(n: number): ContentfulStatusCode` (validating the range once) instead of casting at four sites. *(verified all four)*
- **`@pack/db` `reset.ts` `as unknown as`** — replace with a typed Drizzle query so the double-cast disappears.
- **`safe-fetch.ts` `body as T`** (success path) — the response is `await res.json()` (`any`) cast straight to `T`. No validation despite a `StatsSchema` existing elsewhere. Either validate with the zod schema at the boundary or own the `as T` honestly with a comment — but the current setup gives *false* confidence (schema declared, never run). *(verified: `success<T>` does `body as T`, no parse)*

### 3c. `noUncheckedIndexedAccess` weakening via `svelte.json`

- **`packages/tsconfig/svelte.json:12`** sets `noUncheckedIndexedAccess: false`, overriding the `true` in `bun.json:19`. This silently weakens `@pack/i18n`, `@pack/seo`, `@pack/design-system`, and the dashboard. The concrete fallout: **`packages/i18n/index.ts:16,44`** `dictionaries['en']()` magic-string index access compiles *only* because of this override; under the strict base it would (correctly) be `T | undefined`. **Fix:** remove the override (preferred) and handle the `undefined`, or scope the relaxation far more narrowly. *(verified: svelte.json line 12 = `false`)*

### 3d. `isolatedModules` and `verbatimModuleSyntax`

- **`packages/tsconfig/svelte.json:11`** sets `isolatedModules: true`, but **`bun.json` lacks it**. With `verbatimModuleSyntax` on, `isolatedModules` should be in the base too so per-file transpilation guarantees hold uniformly (Bun transpiles file-by-file). Add it to `bun.json`. *(verified: present in svelte.json, absent in bun.json)*
- `verbatimModuleSyntax` is otherwise respected (type-only imports are marked) — no violations spotted in the API app.

### 3e. `any` elimination, const type params, branded types

- **`packages/design-system/lib/utils.ts:8–9`** — `any` inside conditional types (shadcn-generated). Acceptable as vendored code *if* quarantined, but the file also mixes hand-authored style (see §5); split generated from authored.
- **`safe-fetch.ts`** — `const json = await res.json()` is `any`; type it `unknown` and narrow.
- **Branded types** would help where stringly-typed IDs and the `eco_test` DB-name guard live (a `TestDatabaseUrl` brand makes the guard a *type*, not a runtime string check). Optional, high-polish.
- **`const` type parameters** would tighten the `safeFetch<T>` and i18n dictionary helpers, preserving literal inference — nice-to-have.

---

## 4. Bun 1.3.x Native Adequacy

Distinguishing **"do this"** from **"possible but not worth it"** — and one explicit **"don't."**

### DO

- **`@pack/cache` → `Bun.redis`** — **strong.** The package is a placeholder declaring `bullmq` + `ioredis` with zero implementation and a hard-required `REDIS_URL` at module load that nothing reads. Bun ships a native Redis client (`Bun.redis` / `import { redis } from "bun"`). For a plain cache, drop `ioredis` entirely and use `Bun.redis`. *(bullmq is a separate concern — it needs ioredis; if queues are actually wanted, keep ioredis only for bullmq and document why.)*
- **`@pack/storage` → `Bun.s3`** — **worth evaluating.** Today it's a pure passthrough re-export of `@vercel/blob` (`client.ts` is `export * from '@vercel/blob/client'`), and the declared `BLOB_READ_WRITE_TOKEN` is never used. If the deploy target isn't locked to Vercel Blob, `Bun.s3` (S3-compatible, native, presigned URLs) removes a dependency and the dead token. If Vercel Blob is a hard requirement, keep it but **delete the decorative env var**. *(verified: passthrough + unused token)*
- **`Bun.sleep`** — `graceful-shutdown.ts:45–47` hand-rolls a sleep; replace with `await Bun.sleep(ms)`. *(verified)*
- **`Bun.password`** — already used in `argon2-adapter.ts`. ✅ Note it; only the `memoryCost` value needs fixing (§1.5).
- **`Bun.file`** — use for any config/template reads in `@pack/email` (template loading) instead of `fs`.

### DON'T

- **`@pack/rate-limit` → NOT `Bun.redis`.** The package uses `@upstash/ratelimit` + `@upstash/redis`, which talk to Upstash over **REST (HTTP)**, not the RESP/TCP protocol `Bun.redis` speaks. Swapping in `Bun.redis` would break the Upstash REST transport. Leave it on `@upstash/redis`. The real fix here is **type-level** (the `url`/`token` are `string | undefined` vs the required `string` — deferred runtime failure; tighten pack-env to require them or fail fast). *(verified: `new Redis({ url, token })` from `@upstash/redis`)*

### CAREFUL — `Bun.sql` vs Drizzle

- **Do not rip out Drizzle.** `@pack/db` correctly owns schema, migrations (`drizzle-kit`), typed queries, and `drizzle-seed`. `Bun.sql` is not a replacement for an ORM + migration toolchain.
- **Narrow, justified use of `Bun.sql`:** the raw liveness ping `pingDatabase()` (`db.$client\`select 1\``, line 45) and the `reset.ts` truncation could use a lightweight raw path — but since the `postgres` client is already shared, there's **no benefit** to introducing a second SQL driver. **Verdict: keep postgres.js + Drizzle; don't add `Bun.sql`.** The only DB perf lever worth a look is `prepare: false` (line 16) — the inline comment itself says set `true` for long-running servers, which the API is. Benchmark flipping it.

### `Bun.serve` routes (apps/api)

- The API uses Hono on Bun. Bun's native `Bun.serve({ routes })` is **optional** and not worth migrating a working Hono app — Hono gives middleware, OpenAPI, and validation that the raw router doesn't. **Skip.**

---

## 5. Structural / Morphological

### 5a. Module boundaries — `exports` maps not upheld (highest structural debt)

The stated convention is "every package ships an `exports` map." Reality:

| Package | `exports`? | Imported as |
|---|---|---|
| `@pack/observability` | ✅ (clean, 7 subpaths) | reference to copy |
| `@pack/i18n` | ✅ | — |
| `@pack/seo` | ✅ | (but orphaned, §5c) |
| **`@pack/tools`** | ❌ (`main`/`type` only) | bare `@pack/tools` + deep |
| **`@pack/design-system`** | ❌ | deep-imported heavily by dashboard |
| **`@pack/db`** | ❌ (`main`/`types` only) | `@pack/db/pack-env`, `@pack/db/schema` |
| `@pack/rate-limit` / `cache` / `storage` | ❌ | bare + subpath |

*(All verified.)* `@pack/observability/package.json:10–18` is the model to replicate:
```json
"exports": {
  ".": "./index.ts",
  "./errors": "./errors/index.ts",
  "./logger": "./logger/index.ts",
  "./pack-env": "./pack-env.ts"
}
```
Right now `@pack/db/schema` and `@pack/db/pack-env` resolve **only** via Bun's filesystem fallback — they'd break under Node, a bundler with strict resolution, or any future `tsup`/`exports`-respecting tool. This is the single highest-leverage convention fix.

### 5b. Naming / idiom (morphological)

- **`MString.capitalize()`** (`m-string.ts:46`) is misnamed — it lowercases then title-cases each word with a `NAME_EXCEPTIONS` skip list. That's **`toTitleCase`** (or `toNameCase`), not `capitalize` (which implies "uppercase the first letter"). Rename to match behavior. *(verified)*
- **`MString.valueOf(): string`** (line 109) returns a string — a coercion footgun. `instance + ''` and `==` comparisons silently stringify, and `valueOf` returning the same as `toString` invites bugs in arithmetic/concat contexts. Drop `valueOf` (keep `toString` + the `value` getter) unless implicit coercion is a deliberate, documented feature. *(verified both)*
- **PT/EN mixed comments** in `m-string.ts` (`// --- Funções customizadas ---` vs `// --- Wrappers es-toolkit ---`) and elsewhere — pick one language for code comments.

### 5c. Dead / orphaned code

- **`packages/observability/errors/parse-error.ts`** — zero callers; `import { log } from '../logger'` pulls the whole pino/OTel transport graph into the `errors` subpath, and `log.error` fires on *every* parse (a "parse" that always logs at error level is a footgun). **Delete it.** *(verified: still imports logger, still calls `log.error`)*
- **`@pack/seo`** — entirely orphaned (zero importers). `metadata.ts:28` has an open `[key: string]: unknown` index signature that exists *only* to make a `properties as SeoMetadata` cast compile; `json-ld.ts:17` `export * from 'schema-dts'` re-exports a huge third-party namespace; tenant identity (`eco-system` / `GRN Group`) is hardcoded. Either wire it into the dashboard or remove it from the build.
- **`@pack/payments`** — placeholder (package.json + tsconfig, no source).
- **`@pack/cache`** — placeholder (`index.ts` does not exist; only `pack-env.ts` + `package.json`), yet hard-requires `REDIS_URL` at load and declares `bullmq` + `ioredis`. *(verified: no `index.ts`)*
- **Unused deps:** `resend` in `@pack/email`; `BLOB_READ_WRITE_TOKEN` decorative in storage; `BETTER_AUTH_SECRET` validated-then-unused in auth.

### 5d. Barrel correctness

- **`packages/email/index.ts`** — `export * from 'send'` (bare specifier — must be `'./send'`) and `export * from 'templates/contact'` (**phantom**, file doesn't exist). The barrel throws on import. Fix the relative path and remove/create the missing template export. *(verified both lines)*
- **`@pack/i18n`** has a redundant `./utils` export surface — everything is already on the root barrel. Collapse.

### 5e. Code-style inconsistency (Biome not normalizing generated dirs)

- **`@pack/design-system`** mixes tabs + double-quotes + `.js` extensions (shadcn-generated files) against 2-space + single-quote (hand-authored) — and `lib/utils.ts` mixes *both styles in one file*. Biome is not configured to format the generated directories. **Fix:** either add the generated dirs to Biome's include and re-format, or quarantine them via `overrides` and stop hand-editing them.

### 5f. Convention drift

- **`stringbool({ truthy, falsy })`** config duplicated verbatim in `observability/pack-env.ts` and `db/pack-env.ts` — hoist to a shared `@pack/tools` env helper.
- **Error throwing:** `@pack/db` throws bare `Error`; everyone else throws `AppError`/`BaseError`. Align.
- **Missing `test` scripts:** `@pack/db` and `@pack/auth` have none and no unit tests (observability *does* — `"test": "bun test --preload @pack/testing/preload"` is the pattern to copy). The argon2 adapter and DB connection/guard logic are exactly what should be tested.
- **`setup.timezone()`** (`apps/api/src/main/setup.ts:6`) is a no-op that logs `"Need to setup timezone"` — either implement (`process.env.TZ` is already plumbed via the commented `connection.TimeZone` in db) or remove the stub. *(verified)*
- **Missing `tsconfig.json`** in `@pack/rate-limit` and `@pack/cache`.

---

## 6. Prioritized Action Table

Sorted by leverage (impact × confidence ÷ effort). Severity: Critical / High / Medium / Low. Effort: S (<30 min) / M (hours) / L (day+).

| # | Area | File:Line | Sev | Eff | Fix |
|---|---|---|---|---|---|
| 1 | auth | `packages/auth/server.ts:7` | **Critical** | S | Pass `secret: env.BETTER_AUTH_SECRET` into `betterAuth({...})`; stop relying on the silent `process.env` fallback. |
| 2 | security | `packages/tools/src/crypto/argon2-adapter.ts:9` | **Critical** | S | `memoryCost: 8129` → `19456` (OWASP argon2id baseline); fixes the non-power-of-two typo. |
| 3 | test safety | `apps/api/test/e2e/setup.ts:8` | **Critical** | S | `process.env.DATABASE_URL ||= '...eco_test'` (was plain `=`) so the line-45 `eco_test` guard works. |
| 4 | email | `packages/email/index.ts:1-2` | **High** | S | `'send'`→`'./send'`; remove/create phantom `'templates/contact'`. Barrel currently throws on import. |
| 5 | module boundaries | `packages/{tools,design-system,db}/package.json` | **High** | M | Add `exports` maps (copy `observability/package.json:10-18`). Stops reliance on Bun filesystem fallback. |
| 6 | ts strictness | `packages/tsconfig/svelte.json:12` | **High** | S | Remove `noUncheckedIndexedAccess: false` override; fix the resulting `i18n/index.ts:16,44` `undefined`s. |
| 7 | dead code | `packages/observability/errors/parse-error.ts` | **High** | S | Delete (0 callers; drags logger graph into `errors`; logs at error on every parse). |
| 8 | type soundness | `apps/dashboard/.../sign-in,sign-up/+page.server.ts:22-24` | **High** | S | Replace 5× `data.get(x) as string` with `typeof`-narrowing or a zod parse. |
| 9 | type soundness | `apps/dashboard/src/lib/api/safe-fetch.ts` | **High** | M | Type `await res.json()` as `unknown`; validate with the existing zod schema (or drop the schema's false confidence). |
| 10 | ES lifecycle | `apps/api/src/main/infra/graceful-shutdown.ts:45` | Medium | S | `await Bun.sleep(options.gracePeriod)` replacing the `new Promise`/`setTimeout` sleep. |
| 11 | ES lifecycle | `packages/db/index.ts` + `graceful-shutdown.ts` | Medium | M | Add `[Symbol.asyncDispose]` to db (and OTel handle); adopt `await using` in shutdown + e2e containers. |
| 12 | cache | `packages/cache/*` | Medium | M | Implement with `Bun.redis` (drop `ioredis` unless bullmq is real); remove the unused hard-required `REDIS_URL`. |
| 13 | rate-limit | `packages/rate-limit/pack-env.ts` + `index.ts` | Medium | S | Keep `@upstash/redis` (REST — do NOT swap to `Bun.redis`); make `url`/`token` required in pack-env. Add `tsconfig.json`. |
| 14 | ts | `apps/api/src/main/infra/error-handler.ts:67,83,114` + `openapi/utils.ts:54` | Medium | S | One `toStatusCode(n)` helper instead of 4× `as ContentfulStatusCode`. |
| 15 | ts | `apps/api/src/core/env.ts:27` | Medium | S | Add `'local'` to env enum; drop `('local' as string)`. |
| 16 | ts | `apps/api/src/main/app.ts:28` | Medium | S | Narrow `ORIGIN_ALLOWED` to `string[]` in pack-env so the array fallback type-matches. |
| 17 | ts | `packages/observability/logger/index.ts:25` | Medium | S | `... satisfies pino.LoggerOptions`; remove vestigial `requestId`/`path` pretty fields (58-61). |
| 18 | ts | `packages/observability/sentry/index.ts:12-16` | Medium | S | Replace `as string \| undefined` casts with a typed/narrowed config. |
| 19 | naming | `packages/tools/src/string/m-string.ts:46,109,96` | Medium | S | Rename `capitalize`→`toTitleCase`; drop `valueOf` (coercion footgun); `names.at(-1)`. |
| 20 | ts config | `packages/tsconfig/bun.json` | Medium | S | Add `isolatedModules: true` (already in svelte.json; pairs with `verbatimModuleSyntax`). |
| 21 | convention | `packages/db/index.ts:36` | Low | S | Throw `AppError`/`BaseError` (keep `{ cause }`) to match other packages. |
| 22 | tests | `packages/{db,auth}/package.json` | Low | M | Add `"test"` script (copy observability) + unit tests for argon2 adapter and db guard. |
| 23 | storage | `packages/storage/*` | Low | M | Evaluate `Bun.s3` vs `@vercel/blob`; either way delete the unused `BLOB_READ_WRITE_TOKEN`. |
| 24 | dead code | `packages/seo/*` | Low | M | Wire into dashboard or remove from build; drop the cast-enabling open index signature (`metadata.ts:28`). |
| 25 | dead code | `apps/api/src/main/setup.ts:6` | Low | S | Implement `timezone()` (TZ already plumbed) or remove the no-op stub. |
| 26 | DRY | `observability/pack-env.ts` + `db/pack-env.ts` | Low | S | Hoist duplicated `stringbool({truthy,falsy})` to a shared `@pack/tools` helper. |
| 27 | style | `packages/design-system/**` | Low | M | Configure Biome to format/quarantine generated dirs (tabs/double-quote/.js vs authored 2-space/single-quote). |
| 28 | perf | `packages/db/index.ts:16` | Low | S | Benchmark `prepare: true` for the long-running API (the comment itself recommends it). |

---

### Honest closing note

This is a **healthy, modern boilerplate** whose problems are overwhelmingly *consistency and follow-through*, not architecture: validated-then-discarded config, an `exports`-map convention applied to the wrong half of the packages, a handful of unsound `as` escapes, and modern ES resource-management left on the table. Items 1–9 are mostly S-effort and remove the genuinely dangerous gaps (auth secret, weak password cost, the e2e DB guard hole, the import-time-throwing email barrel). The `using`/`Symbol.asyncDispose` adoption (10–11) is the most *interesting* modernization but not the most urgent. Nothing here requires rearchitecting; it requires finishing.
