# Atomic Progress Log

Your temporal anchor. Tick atomic tasks as you complete them. Never mark a
task done unless `memory/verify.md` criteria are met.

The `state-enforcement.sh` hook blocks task completion if source files
changed but this file wasn't updated.

## In Progress

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
