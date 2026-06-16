# Atomic Progress Log

Your temporal anchor. Tick atomic tasks as you complete them. Never mark a
task done unless `memory/verify.md` criteria are met.

The `state-enforcement.sh` hook blocks task completion if source files
changed but this file wasn't updated.

## In Progress

- [x] **TECHNICAL_ANALYSIS.md §6 implementation** (one commit per slice, each
      verified before commit). Baseline commit `63896f9` first committed ALL the
      v2 in-flight work below (observability port + test harness + dockerize +
      dep update + `@pack/rate-limit` removal + 3 root analysis docs), no
      co-author — so the "Nada commitado" notes further down are now landed.
      - Slice 1 `ae7474a`: #2 `secret: env.BETTER_AUTH_SECRET` into `betterAuth`;
        #3 argon2 `memoryCost` 8129→19456; #4 **kept** e2e `DATABASE_URL =`
        (NOT `||=`) — Bun auto-loads `packages/db/.env`, so the unconditional
        override is required; the `||=` recommendation was a misdiagnosis caught
        by running e2e; #7 email barrel `'send'`→`'./send'` + tsconfig
        svelte→bun base + `jsx`. Verify: unit 10/10, e2e 7/7, tsc+biome.
      - Slice 2 `914f0bd`: #5 dashboard vite cold-start — `optimizeDeps` for
        transitive deps via nested `@pack/design-system > dep` (isolated linker
        won't resolve them bare), `server.warmup`, `ssr.noExternal` gated to
        build. ~37s→~20-26s cold on this (slow) box; icon globs HELP (removing
        them regressed). Prod build verified.
      - Slice 3 `6659b76`: #6 migrate dashboard `lucide-svelte` (deprecated) →
        `@lucide/svelte` (4 files, deep imports); catalog + lockfile unified on
        `@lucide/svelte@1.18.0`. Prod build verified.
      - Slice 4 `6f1d34e` (#8a): `exports` maps on `@pack/db`
        (`.`/`./schema`/`./pack-env`) + `@pack/tools` (`.`). Verify: tsc
        (auth/db/tools/api) + runtime import of all subpaths + e2e 7/7.
        **GOTCHA: never run the e2e in background** — backgrounded docker-compose
        orchestration hung 331s and failed 0/8; foreground passes 7/7 in ~3s.
        #8b (`@pack/design-system` exports map) deferred (fiddly subpaths/CSS).
      - Slice 5 `15c6eb2`: #10 delete dead `parse-error.ts` (0 callers; was
        dragging the pino/OTel graph into the `errors` subpath) + barrel entry;
        #11 dashboard sign-in/sign-up FormData `as string` → `typeof`-narrowing
        (rejects `File`/null). Verify: obs tsc + 30/30 + api tsc; svelte-check
        0 errors in both server files (it also surfaced a pre-existing `asChild`
        type error in `user-avatar.svelte` → #32).
      - Slice 6 (this commit, #32): added `svelte-check@4.6.0` devDep (the
        `typecheck` script was exit 127 without it); fixed the `asChild` type
        error (`user-avatar.svelte` → `child` snippet only, bits-ui 2.x);
        `biome --write` on `auth-proxy.ts` + `+error.svelte`. Dashboard now
        **typecheck 0/0/0 + biome clean**.
      - Slice 7 (this commit): #17 `apps/api/src/core/env.ts` — widened via
        `const nodeEnv: string` (drops `('local' as string)`); #18 `app.ts` —
        removed the dead `|| ['http://localhost:3000']` CORS fallback
        (`ORIGIN_ALLOWED` is already required `string[]` via auth pack-env
        `.transform()`, so the array fallback was unreachable). **Both
        refactor-only** (TDD nudge on env.ts: the `isProduction/isDevelopment/
        isLocal` exports pre-existed; only `isLocal`'s impl changed). #16
        (`toStatusCode` helper) deferred as cosmetic. Verify: api tsc + e2e 7/7.
      - Slice 8 (this commit): #19 observability — `loggerOptions … satisfies
        LoggerOptions`; Sentry `as string|undefined` casts → an `asTag()`
        narrowing helper. **Kept** the pretty `requestId`/`path` fields (LIVE
        dashboard bridge, NOT vestigial — analysis #19 was wrong on that).
        #20 tools `m-string` — `capitalize`→`toTitleCase`, dropped `valueOf`,
        `names.at(-1)`, PT→EN comments (zero callers, the util is unused).
        #23 (db AppError) + #28 (stringbool DRY) deferred — both would add a
        dep edge to a low-level package for marginal gain. Verify: obs tsc +
        30/30 + tools tsc + biome.
      - Slice 9 (this commit): #21 `isolatedModules: true` in `bun.json` (all
        consumers clean — verbatimModuleSyntax already covered it). #9 removed
        `noUncheckedIndexedAccess:false` from `svelte.json` (+ its redundant
        re-declarations; now only adds DOM `lib`). Consumers `auth`/`obs`/`i18n`
        clean after fixing 4 i18n errors — `getDictionary` rewritten to a typed
        `loadDictionary(locale: Locale)` (also removes the double-fallback) +
        `format.ts` `?? 'USD'`. Dashboard svelte-check still 0/0/0. Found en
        route → #33: `@pack/design-system` `typecheck` is `tsc` which can't
        check Svelte named exports (needs svelte-check; pre-existing).
      - Slice 10 (this commit): #12 dashboard `safe-fetch` — `safeFetch` now
        takes an optional `schema?: ZodType<T>` and runs `schema.parse(body)` at
        the boundary; `+page.server.ts` passes `StatsSchema` (it was declared
        but never executed — false confidence). `failure()` reads `res.json()`
        as `unknown` + narrows (was `any`). Verify: dashboard svelte-check 0/0/0.
      - Slice 11 (this commit, #15): implemented `@pack/cache` with native
        `Bun.RedisClient` (Bun 1.3.x — verified the API via web research vs the
        official docs + bun-types). Dropped `bullmq`/`ioredis`. Exports: `cache`
        (client) + typed `cacheGet/Set/Del/Has/Remember` (TTL via `SET EX`) +
        `disconnectCache()`. Added exports map + tsconfig (had neither).
        `REDIS_URL` kept required. **No test** — meaningful tests need a real
        Redis (deferred like the e2e DB tier); the API usage is tsc-verified.
- [x] Ambiente de testes do `apps/api` (bun:test, real-DB, mac-dashboard-style;
      plano em `tasks/done/api-test-environment.md`). Dois tiers: **unit**
      (`bun test test/unit`, sem docker, roda no turbo) + **e2e** (`bun run test:e2e`,
      gated `E2E=1`, Postgres efêmero via `infra/docker/docker-compose.test.yml`).
      `test/e2e/`: `run.ts` (compose up→test→down), `setup.ts` (preload: env de teste
      + migrate programático + truncate-per-test + disconnect, gated E2E=1),
      helpers `{containers,reset,app,auth}`, `factories/` (makeUser), rotas
      (status/ready/stats/auth) + smoke. `test/helpers/mock-db.ts`. Os 3 testes
      co-localizados migraram pra `test/unit/`. `app.ts` refatorado pra `buildApp()`
      factory (+ default p/ server.ts) — **refactor-only** (TDD nudge: a factory só
      embrulha a construção existente). +drizzle-orm/postgres como devDeps do api
      (test harness importa direto, igual mac). Auth helper usa rotas reais
      `/auth/sign-up|sign-in/email` (better-auth) → cookie. Verify: **unit 10/10**
      (sem docker) + **e2e 7/7** (Postgres real: migrate, truncate, sessão,
      stats 401→200) + tsc api exit 0 + biome limpo. Nada commitado.
- [x] Reorg estrutural `@pack/observability` (refactor-only, behavior-preserving;
      plano em `tasks/done/observability-structure.md`, via `/plan-eng-review`).
      Layout consistente com o monorepo (espelha design-system: pastas-de-domínio
      na raiz, sem `src/`): nova pasta `sentry/` (index=capture + scrub.ts);
      `context.ts`→`context/index.ts`; `error.ts`/`parseError`→`errors/parse-error.ts`
      (exportado pelo barrel, arrow→function); barrel raiz `index.ts`
      (errors+logger+context+sentry, NÃO instrumentation/pack-env); `exports` map
      no package.json (estilo `auth`, subpaths estáveis → 0 edição nos consumidores);
      testes centralizados em `tests/`. Deletado `redactError` (morto+bugado, 0 callers).
      NÃO mexido: pino-pretty `requestId`/`path` (bridge VIVO do dashboard,
      `hooks.server.ts:39`); `pack-env.ts`/`instrumentation.ts` flat (convenção repo).
      TDD: refactor puro, "exports novos" são arquivos movidos / re-exports.
      Verify: 30/30 testes (bun) + tsc observability/api exit 0 + biome limpo +
      `@pack/observability/logger` resolve no dashboard (bundler+exports map).
      Nada commitado.
- [x] Observabilidade Fase 2b/2c — OTel traces/métricas + wiring (D12 desacoplado):
      `instrumentation.ts` + NodeTracerProvider(BatchSpanProcessor→OTLP) +
      MeterProvider(PeriodicExportingMetricReader→OTLP) + HostMetrics, gated
      OTEL_EXPORTER_OTLP_ENDPOINT (OTel SDK 2.x, sdk-trace-node/metrics 2.7.1).
      `@hono/otel@1.1.2` (httpInstrumentationMiddleware) no app.ts envolvendo
      observability. logger mixin: `spanToFields(trace.getActiveSpan())` →
      trace_id/span_id. pack-env +OTEL_*. LGTM compose + docker:obs:up/down (D7).
      Opt-out logger api (D11): LOG_PRETTY=false + `| pino-pretty` no dev +
      pino-pretty devDep; .env/.env.example com vars default-off. shutdownObservability
      flusha provider+meter+Sentry. Verify: 43 testes turbo + smoke runtime Bun
      (getActiveSpan ok, shutdown ok) + smoke app real (OTEL on → trace_id no
      access log; off → sem trace_id) + compose válido. FASE 2 COMPLETA.
      Falta só verificação manual: docker:obs:up + tráfego + ver trace no Grafana.
- [x] Observabilidade Fase 2a — Sentry (erros), topologia DESACOPLADA (D12):
      `@sentry/bun@10.56.0`; `sentry-scrub.ts` (scrubPii beforeSend + allowlist
      PII), `sentry.ts` (`captureError`/`sentryCaptureOptions` — encapsula Sentry
      no @pack/observability, api não importa @sentry/bun direto), `instrumentation.ts`
      (Sentry.init gated SENTRY_DSN, skipOpenTelemetrySetup+tracesSampleRate:0,
      beforeSend scrub; export shutdownObservability). handleError usa captureError.
      server.ts 1º import instrumentation; graceful flush wired. pack-env +SENTRY_DSN.
      Verify: 28 obs + 10 api testes + runtime Bun (no-DSN no-op / DSN init sem throw).
- [x] Observabilidade Fase 1 / Fatia 5 — health split + fix graceful (D5):
      `/status` (liveness, sempre 200) + `/ready` (readiness via DI:
      `createReadyRoute({ping,isShuttingDown})`, 503 no drain / 503 db-down /
      200 ok); `pingDatabase()` add no @pack/db (`db.$client\`select 1\``);
      `/health` removido, constants/setup/dofigen healthcheck → `/status`. Fix
      do bug: `shouldRegisterGracefulShutdown({skip})` = `!skip` (roda em TODO
      ambiente salvo SKIP_GRACEFUL) substitui `(isLocal||isDevelopment)&&SKIP`;
      server.ts usa o predicado. Testes: health.test (4) + graceful regression
      (1). Verify: 10 api tests + app real /status 200 e /ready 503(db down).
      **FASE 1 COMPLETA** (35 testes turbo). Flush de observ. no graceful = Fase 2.
- [x] Observabilidade Fase 1 / Fatia 4 — wiring no apps/api: novo
      `middleware/observability.ts` (ALS via `runWithContext` + `c.set('obsContext')`
      pro onError fora do escopo ALS + access log com QUIET_PATHS) substitui
      `request-logger.ts` (removido). `handleError` reescrito: classifica → loga
      estruturado → roteia Sentry (no-op stub Fase 2) → `support_id` no corpo;
      **5xx não vaza message interna** (bug pego pelo e2e). `createErrorSchema`
      +support_id; `handleZodError` usa SchemaError + support_id. Casts
      `ContentfulStatusCode` no `c.json`. `observability.test.ts` (5 e2e via
      app.request). Verify: typecheck 0 + e2e 5/5 + biome + app real carrega e
      middleware roda com contexto completo (base+support_id+request_id no access
      log) + /health 200 quiet. Total turbo: 30 testes.
- [x] Observabilidade Fase 1 / Fatia 3 — logger base/mixin
      (`@pack/observability/logger`): `loggerOptions` (export testável, sem
      transport) com `base` (service/environment/instance/version/region) +
      `mixin()` lendo o ALS (`getContext`). pack-env ganhou SERVICE_NAME/
      SERVICE_VERSION/DEPLOYMENT_ENV/REGION/HOSTNAME/VERBOSE (todas
      default/optional). Worker pino-pretty MANTIDO (D11=A: dashboard intacto;
      API opta por sair com LOG_PRETTY=false+pipe na Fase 2/wiring). Mixin é
      no-op até o middleware popular o contexto (Fatia 4). `logger.test.ts`
      (4 testes, captura o stream do pino). Verify: 25/25 turbo + typecheck
      observability/api exit 0 + biome + dashboard import (`log`/`Logger`) intacto.
      PACOTE @pack/observability COMPLETO (errors+context+logger).
- [x] Observabilidade Fase 1 / Fatia 2 — `context.ts` (AsyncLocalStorage):
      `RequestContext` + `getContext`/`setContext`/`runWithContext`/
      `generateSupportId`(SUP-+12hex)/`parseCfRay`. Adaptação vs fonte Fastify:
      `runWithContext` usa `storage.run(ctx, next)` (scoped, sem leak) porque o
      middleware Hono embrulha o `next()`; a fonte usava `enterWith`. 9 testes
      (`context.test.ts`). Verify: 18/18 (errors+context) + typecheck + biome.
- [x] Observabilidade Fase 1 / Fatia 1 — contrato de erro enriquecido
      (`@pack/observability/errors`): novo `AppError` (code/statusCode/errorCode/
      classification/eventCategory/userMessage) sobre o `BaseError`; nova
      `classification.ts` (`ErrorClassification`, `shouldReportToSentry`,
      `defaultClassification`); `SchemaError` rebasado em `AppError`
      (BAD_REQUEST/400 + validation_error, `fromZod(err, raw?)` compatível);
      `+TOO_MANY_REQUESTS`(429) em error-code/utils; removido `log.ts` (console),
      `error.ts` aponta pro Pino; `errors.test.ts` (9 testes, bun:test). api segue
      compilando (fromZod raw opcional). Verify: turbo test 9/9 + typecheck
      observability/api exit 0 + biome limpo. handleError (T5) consome isso na Fatia 4.
- [x] Observabilidade Fase 0 — test runner Vitest → `bun:test` (plano em
      `tasks/done/observability.md` D9/D10). Removido vitest (devDep root +
      `catalogs.testing` + dep `apps/api`); `@pack/testing` reescrito de factory
      Vitest React/jsdom (`index.js`) pra helpers `bun:test` (`index.ts`
      `setTestEnv()` + `preload.ts` + `runner.test.ts` smoke). Wiring: preload
      é POR-PACOTE via `--preload` (bun não sobe ao bunfig da raiz a partir de
      subpacote); `linker=isolated` exige `types:[bun,node]` no tsconfig;
      `bun test` sai 1 sem testes (só dar script `test` a pacote com suite);
      canônico é `bun run test` (turbo), nunca `bun test` da raiz (pega
      `study/`). Verify: turbo test 3/3 verde + typecheck ok. Novos exports em
      `@pack/testing/index.ts` cobertos por `runner.test.ts`.
- [ ] Migration debt cleanup before re-enabling verify gate
- [x] Revert c44f310 (`getSession` middleware on `/auth/*`) — reintroduced
      the sign-in hang the PRD §5 had already fixed. Refactor-only, no new
      exports; `auth` Hono instance was pre-existing.
- [x] Frontend observability (DX) — `requestId` + child pino logger on
      `event.locals` via `logHandle`; `handleError` server + client;
      browser logger `$lib/logger`; sign-in/sign-up/sign-out with
      `AbortSignal.timeout(10s)` + structured log events
      (attempt/response/rejected/fetch-failed). Refactor — handler exports
      are the SvelteKit framework contract, not user-facing API.
- [x] Auth Layer 1 from `tasks/auth-improvements-plug-and-play.md`:
      drop `nextCookies()`, enable built-in `rateLimit`, fix cookie
      URL-encode bug in sign-in/sign-out via `parseSetCookieHeader` +
      `encode: v => v`, swap `getSessionCookie` for `getCookieCache`
      (HMAC validation) in `sessionHandle` with token-presence fallback.
      Refactor-only — `handle`/`handleError` exports are SvelteKit
      framework contracts, no user-facing API added.
- [x] Auth form-action log hardening:
      added `$lib/auth-proxy.ts` (`authFetch` / `redactEmail` /
      `userMessageFor`) and migrated sign-in / sign-up / sign-out to
      structured pino fields (`auth.<flow>.<event>`), redacted email
      logging (domain + 2-char hint), and `requestId` propagated to
      fail() responses + UI `ref:` line. Refactor-only; new exports in
      `auth-proxy.ts` have no tests yet (helpers exercised end-to-end
      via the form actions; unit tests TBD when stack stabilizes).
- [x] Quiet down 4xx in `handleError`:
      `apps/dashboard/src/hooks.server.ts` — for `status >= 400 && < 500`
      (404, 401, 403, etc — user-driven, expected) emit a single
      `warn` line `{status, errorId}` without the `err` serializer
      so the stack stays out of the log. Genuine 5xx exceptions
      keep the full `err` (stack, cause, name) at `error` level.
      Replaces the always-`error+stack+text` pattern that was
      dumping ~10 lines per 404. Refactor — `handleError` is a
      SvelteKit framework contract.
- [x] Locale-aware 404 / error page (root-level):
      `apps/dashboard/src/routes/+error.svelte` — renders the HTTP
      status big and centered with a localized title and description
      (`app.errors.{notFound, notFoundDescription, unauthorized,
      serverError, backHome}` added to en/pt/es), shows `errorId`
      if `handleError` stamped one, and a "back to home" Button
      (Button auto-renders as `<a>` when given href). `localeHandle`
      already redirects unprefixed paths to `/{locale}/...`.
      Initially placed at `[locale]/+error.svelte` but had to move
      to the root: SvelteKit's `respond_with_error` only mounts
      `manifest._.nodes[0]` (root layout) + `nodes[1]` (root error)
      for path-not-found 404s — nested `+error.svelte` files only
      catch errors *inside* matched routes. Reads `locale` /
      `dictionary` directly from `page.data` (populated by root
      `+layout.server.ts` from `event.locals`) instead of the
      Svelte i18n context, since `[locale]/+layout.svelte`'s
      `setI18n` call doesn't run for root-level errors. Refactor —
      `+error.svelte` is a SvelteKit framework contract.
- [x] Theme contrast fix (dark mode destructive):
      `packages/design-system/styles/colors.css` — dark
      `--destructive` `oklch(0.396 …)` was failing WCAG AA on dark
      bg (~1.5:1). Bumped to `oklch(0.704 0.191 22.216)` (shadcn-ui
      standard); both modes' `--destructive-foreground` set to
      near-white so `bg-destructive text-destructive-foreground`
      renders correctly (light-mode bug: foreground was identical
      to background, invisible). Sidebar logout row tightened —
      dropped `/70` opacity on the text label, icon kept at `/80`.
- [x] Force full reload on locale dropdown change:
      `language-selector.svelte` swaps `goto()` (SvelteKit
      client-side nav) for `window.location.assign()`. Locale change
      now resets `<html lang>`, dictionary, and any locale-bound
      state from a fresh server render — the `goto()` partial-data
      refresh was leaving stale i18n context in components.
      Refactor-only — `handleChange` is a private inline handler,
      no exported API change.
- [x] Localize better-auth API error responses:
      `auth-proxy.ts` adds `localizeAuthError(status, body, copy)` and
      `AuthErrorCopy` type. Maps better-auth's English-only error
      codes (INVALID_EMAIL_OR_PASSWORD, INVALID_EMAIL,
      USER_ALREADY_EXISTS*, PASSWORD_TOO_SHORT/LONG, EMAIL_NOT_VERIFIED,
      INVALID_PASSWORD, INVALID_USER) to dictionary-backed strings;
      HTTP 429 (rate-limit, no `code`) handled by status fallback.
      Unknown codes fall through to `body.message ?? copy.unknown`.
      Sign-in / sign-up form actions use it; replaced the now-redundant
      `signInFailed` / `signUpFailed` keys (dropped from dicts) with
      the catch-all `unknown` and the specific code mappings. New
      exports `localizeAuthError`, `AuthErrorCopy` are refactor-only
      (1 caller per flow, 2 form actions).
- [x] i18n cleanup pass (en/pt/es):
      Dropped `web.*` (~190 unused lines/dict — leftover marketing
      copy never wired into the dashboard). Added new `app.errors.*`
      keys (reference, missingFields, signInFailed, signUpFailed,
      timeout, unreachable), `app.common.{selectLanguage, user}`,
      `app.dashboard.noActivity`. Polished pt/es welcome to be
      gender-neutral. Migrated form actions + `auth-proxy.userMessageFor`
      to source copy from `locals.dictionary.app.errors` instead of
      hardcoded English. i18n'd `language-selector` aria-label,
      authenticated dashboard "no activity" text, and the `ref:`
      correlation-id line in sign-in/sign-up. Refactor-only;
      `userMessageFor` signature changed but only one caller per
      flow (3 form actions).
- [x] i18n monetary base (boilerplate "visual sensor" only):
      `packages/i18n/format.ts` adds `formatCurrency` / `formatNumber` /
      `formatPercent` thin wrappers around `Intl.NumberFormat`, with
      sensible default currency per locale (en→USD, pt→BRL, es→EUR).
      Apps that need real money handling — multi-tenant, conversion,
      tax, audit — own that layer themselves; this file stays a pure
      display helper. Also fixed the latent bug where pt/es stats `type`
      discriminator was translated (`unidade`/`moneda`) — restored to
      literal `unit`/`currency`. New helpers exercised end-to-end via
      the authenticated dashboard page; unit tests TBD.
- [x] API request logger overhaul:
      `apps/api/src/main/middleware/request-logger.ts` — pino-backed
      single-line logger with child binding (`requestId`, `path`),
      auto-fills `user_id` after authMiddleware runs, downgrades
      `/health` to `debug`. Drops `hono/logger` from `app.ts`.
      Cross-tier correlation: dashboard's `logHandle` requestId is
      forwarded as `x-request-id` via `authFetch`, `createApiClient`,
      and `authHandle` proxy; Hono's `requestId()` middleware reuses
      the incoming value (falls back to a UUID otherwise). New exports
      (`requestLogger`, `AppVariables`, `createApiClient` arity bump)
      are refactor-only — exercised end-to-end by the dev server.

## Completed (this session)

- [x] Bootstrap agent-md template (17 files via touch-claude)
- [x] Fix m-string.ts undefined access bug
- [x] Biome auto-fixes: .vscode/settings.json, .claude/settings.local.json,
      packages/tools/index.ts, apps/api/tsconfig.json,
      packages/design-system/tsconfig.json, biome.json
- [x] Add biome ignores for packages/design-system/styles + study/
- [x] Remove typecheck script from @pack/tsconfig (config-only pkg)
- [x] Add typecheck task to turbo.json
- [x] Stub verify gate in agent-md.toml during migration
- [x] Compact stop-verify hook output (~90 → ~17 lines via compact_errors)
- [x] Fix Stop hook schema bug (hookSpecificOutput.additionalContext → systemMessage)
- [x] Two-commit split: deps bump (e52c934) + agent-md bootstrap (5bed406)
- [x] Remove React/Next leftovers from Svelte migration:
      packages/auth (4 files + deps), observability/testing pkg deps, root catalog

## Backlog (migration debt — re-enable verify after)

- [ ] @pack/payments — empty package, tsconfig include matches no files;
      either remove typecheck script or add .gitkeep stub
- [ ] apps/api — broken imports likely resolved by deps bump; revalidate
- [ ] apps/dashboard — $lib/env missing; +layout.server.ts/+page.server.ts
      need explicit .js extensions for NodeNext moduleResolution
- [ ] packages/db/schema/User/*.ts — useFilenamingConvention failures
      (PascalCase vs kebab-case); decide: rename or override rule for path

## Blocked

<!-- empty -->

## Notes

- Dangling diff in `apps/dashboard/src/routes/[locale]/(unauthenticated)/+layout.svelte`
  (added `cursor-pointer` to a button) is from the user's editor / vite hot
  reload during dev probes — not part of this session's tracked tasks.
- `screenshots/` is for ad-hoc local visual evidence; `.gitignore` skips
  PNG dumps but `.gitkeep` is committed so the directory exists in the
  repo for new clones.
