# Auth System — Architecture, Decisions & Roadmap

> Single source of truth for the auth subsystem. Supersedes
> `auth-architecture-review.md` (2026-04-16) and
> `auth-improvements-plug-and-play.md` (2026-05-09).
>
> Last consolidated: 2026-05-09.
> Status legend: ✅ done · 🟡 in flight · 🔲 pending · ❌ won't do

---

## 1. TL;DR — current state

The dashboard (SvelteKit `:3000`) proxies `/auth/*` to the API (Hono `:3002`)
which runs `better-auth.handler`. Sessions are validated locally via the
HMAC-signed `cookieCache` cookie (`getCookieCache`) in the SvelteKit
`sessionHandle`, with fallback to token-presence check when the cache is
stale. Form actions (sign-in / sign-up / sign-out) call the API via a
small typed helper (`$lib/auth-proxy.ts`) and forward Set-Cookie headers
through `parseSetCookieHeader` + `encode: v => v` to avoid URL-encoding
the base64 payload (the bug that was breaking login).

The "Layer 1" plug-and-play improvements are **done**. Layers 2-4 remain
optional, scoped here for future sessions.

---

## 2. Architecture

### 2.1 Request flow

```
Browser
  │
  ├─ GET/POST /auth/*  ─►  SvelteKit hooks.server.ts
  │                          authHandle: fetch(API_URL + pathname)
  │                          ▼
  │                        Hono :3002 /auth/* → bAuth.handler(req.raw)
  │
  ├─ GET /{locale}/*   ─►  SvelteKit hooks.server.ts
  │                          logHandle (requestId, child pino logger)
  │                          authHandle (short-circuit if /auth/*)
  │                          localeHandle
  │                          sessionHandle (¹)
  │                          i18nHandle
  │                          ▼
  │                        SvelteKit load functions (read locals.session)
  │                        load → /v1/* via fetch
  │                          ▼
  │                        Hono :3002 /v1/* — authMiddleware (²)
  │
  └─ Direct: Hono :3002 /auth/*  ←── still reachable in this topology (³)
```

- **(¹)** `sessionHandle` calls `getCookieCache(request, { secret })`. Real
  HMAC validation when cookie cache is fresh (≤ 5 min), token-presence
  fallback when stale. No DB hop on the fast path.
- **(²)** `authMiddleware` calls `auth.api.getSession()`. cookieCache hit →
  no DB; miss → DB query. Refreshes cache as a side-effect.
- **(³)** Open question — see §6 (production topology).

### 2.2 Foundational fact

`better-auth.handler` is a Web Fetch standard handler:

```ts
type Auth = {
  handler: (request: Request) => Promise<Response>;
  api: InferAPI<...>;
  // ...
};
```

Runs identically in Hono / SvelteKit / Bun / Node / Deno / Workers. There
is **no `better-auth/hono`** package — `auth.on(['POST','GET'], '/*',
(c) => bAuth.handler(c.req.raw))` is the canonical pattern. Hono is opaque
to auth (internal routes resolved by better-auth itself).

### 2.3 Packages

| Package | Role |
|---|---|
| `@pack/auth/server` | `betterAuth` instance (drizzle adapter, rate limit, cookieCache) |
| `@pack/auth/cookies` | Re-exports `getSessionCookie`, `getCookieCache`, `parseSetCookieHeader`, `toCookieOptions` from `better-auth/cookies` |
| `@pack/auth/client.svelte` | Reactive Svelte stores via `createAuthClient` (currently unused — see §5 Layer 2) |
| `apps/api` | Hono — mounts `/auth/*` (handler) and `/v1/*` (with `authMiddleware`) |
| `apps/dashboard` | SvelteKit — proxy `/auth/*`, form actions for sign-in/up/out, session guard via `getCookieCache` |

---

## 3. Implemented (✅ done)

### 3.1 betterAuth instance hardening

| # | Change | File | Date |
|---|---|---|---|
| 1 | `baseURL: env.BETTER_AUTH_URL` | `packages/auth/server.ts` | 2026-04-16 |
| 2 | Drop `nextCookies()` plugin (Next.js dead code) | `packages/auth/server.ts` | 2026-05-09 |
| 3 | Enable built-in `rateLimit` (5/min on sign-in, 3/h on sign-up & forget-password) | `packages/auth/server.ts` | 2026-05-09 |
| 4 | `cookieCache: { enabled: true, maxAge: 60 * 5 }` | `packages/auth/server.ts` | pre-existing, kept |

### 3.2 Session validation in SvelteKit

| # | Change | File | Date |
|---|---|---|---|
| 1 | Replace `getSessionCookie` (presence check) with `getCookieCache` (HMAC) | `apps/dashboard/src/hooks.server.ts` | 2026-05-09 |
| 2 | Token-presence fallback when cache stale (graceful, no logout-on-idle) | same | 2026-05-09 |
| 3 | Populate `locals.session` and `locals.user` with typed real data | same + `app.d.ts` | 2026-05-09 |
| 4 | `BETTER_AUTH_SECRET` env added to dashboard (must match API's value) | `lib/env.ts`, `.env.example` | 2026-05-09 |

### 3.3 Cookie URL-encode bug fix (was breaking sign-in)

Root cause: SvelteKit's `cookies.set()` defaults to `encodeURIComponent`
on the value. `better-auth.parseCookies()` does not decode. HMAC over the
encoded value failed → `/v1/*` returned 401 → authenticated page redirected
back to sign-in.

| # | Change | File | Date |
|---|---|---|---|
| 1 | `parseSetCookieHeader` + `toCookieOptions` to forward set-cookies | sign-in `+page.server.ts` | 2026-05-09 |
| 2 | `encode: (v) => v` to bypass SvelteKit's default URL-encode | same | 2026-05-09 |
| 3 | Same pattern for cookie deletion in sign-out | sign-out `+page.server.ts` | 2026-05-09 |

### 3.4 Form-action observability + DX

| # | Change | File | Date |
|---|---|---|---|
| 1 | New helper `authFetch / redactEmail / userMessageFor / reasonFor` | `apps/dashboard/src/lib/auth-proxy.ts` | 2026-05-09 |
| 2 | Structured pino fields, namespaced events `auth.<flow>.<event>` | sign-in / sign-up / sign-out | 2026-05-09 |
| 3 | Email PII redacted to `{ domain, localHint }` | same | 2026-05-09 |
| 4 | `requestId` propagated to `fail()` response + `ref:` line in error UI | same + sign-in/up `+page.svelte` | 2026-05-09 |
| 5 | Removed `signin missing fields` warn (validation noise) | sign-in / sign-up | 2026-05-09 |

### 3.5 Pino + DX

| # | Change | File | Date |
|---|---|---|---|
| 1 | `LOG_PRETTY` defaults to `process.stdout.isTTY` (auto-detect TTY for pretty in dev) | `packages/observability/logger/index.ts` | 2026-05-09 |
| 2 | `pino` + `pino-pretty` declared as direct dashboard deps so build (adapter-node) can resolve them at runtime | `apps/dashboard/package.json` | 2026-05-09 |
| 3 | `ssr.external: ['pino', 'pino-pretty', 'thread-stream']` so `__dirname` is resolved at runtime, not bundled | `apps/dashboard/vite.config.ts` | 2026-05-09 |

---

## 4. Architectural alternatives (analyzed, current decision)

Recorded for context — these were considered when designing the current
flow.

### Option A — Move auth into SvelteKit (`svelteKitHandler`)

SvelteKit becomes the auth server. `svelteKitHandler` intercepts `/auth/*`
and runs `auth.handler(request)` locally. Hono keeps only `/v1/*` with
`authMiddleware`.

- ✅ Eliminates manual proxy
- ✅ `sveltekitCookies` plugin can run (correct cookie attrs incl. `secure`)
- ✅ Sign-in/up call `auth.api.signInEmail()` — no `fetch()` manual
- ❌ Hono's `/auth/*` keeps existing in parallel unless explicitly closed
- ❌ SvelteKit gets `DATABASE_URL` (compromised dashboard ≠ DB compromised
  is no longer true)
- ❌ Bypasses any future Hono-side rate limiting on auth flows

**Verdict:** valid future direction when there's only one frontend; not
now (single-API-perimeter model still preferred).

### Option B — Two `betterAuth` instances

`@pack/auth/server.ts` becomes a factory; dashboard creates its own
instance with `sveltekitCookies` plugin (factory pattern needed because
`getRequestEvent()` is SvelteKit-only).

- Same wins as Option A
- ❌ `betterAuth()` instantiated twice (same DB, same secret, no isolation
  benefit)

**Verdict:** rejected — duplication without real isolation.

### Option C — `auth.use()` after instantiation

Register `sveltekitCookies` on the existing instance.

- ❌ better-auth has no such API. Plugins are constructor-only.

**Verdict:** not possible.

### Option D — Cookie-cache validation in `sessionHandle` (✅ current)

Replace `getSessionCookie()` (presence) with `getCookieCache()` (HMAC).
No architecture change. cookieCache HMAC validates locally; falls back to
token-presence when stale (graceful, avoids forced re-login on idle).

- ✅ Real validation
- ✅ Zero DB hop on fresh cache
- ✅ No env additions beyond `BETTER_AUTH_SECRET` (which has to match API)
- ✅ Implemented 2026-05-09

---

## 5. Remaining tech debt / pending decisions

### 5.1 Layer 2 — typed client (1-2h, optional DX)

`packages/auth/client.server.ts` (new) using `better-auth/client` vanilla:

```ts
import { createAuthClient } from 'better-auth/client';
export const authClient = createAuthClient({
  baseURL: process.env.API_URL,
  basePath: '/auth',
});
```

Form actions become:

```ts
const { data, error } = await authClient.signIn.email(
  { email, password },
  { headers: { Cookie, Origin } }
);
```

Wins: typed `data` / `error`, removes `as Record<string, string>` casts,
~30% less boilerplate per form action. No architectural change.

**Status:** 🔲 pending. Estimated 1-2h. No blocker.

### 5.2 Layer 3 — idempotent proxy in `authHandle` (2-3h, optional)

Centralize Set-Cookie forwarding inside `hooks.server.ts → authHandle`
using `parseSetCookieHeader` + `event.cookies.set` with `encode: v => v`.
Form actions stop touching cookies entirely — they just read `data`/`error`.

```ts
const authHandle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/auth')) return resolve(event);
  const upstream = await fetch(target, { /* ... */ });
  const setCookieHeader = upstream.headers.get('set-cookie');
  if (setCookieHeader) {
    for (const [name, attrs] of parseSetCookieHeader(setCookieHeader)) {
      event.cookies.set(name, attrs.value, {
        ...toCookieOptions(attrs),
        encode: (v) => v,
        path: attrs.path || '/',
      });
    }
  }
  // strip set-cookie from response, return rest
};
```

Wins: cookie forwarding in **one** place; form actions get simpler.

**Status:** 🔲 pending. Estimated 2-3h. No blocker.

### 5.3 Layer 4 — full SvelteKit-native auth (Option A)

See §4 Option A. Out of "plug-and-play" scope.

**Status:** ❌ won't do until product decides on multi-frontend strategy.

### 5.4 Production topology — `/auth/*` exposure

The Hono API at `:3002` exposes `/auth/*` directly. In production this
means a public Hono endpoint bypasses any SvelteKit-level rate limit /
CSRF / observability.

**Decisions needed:**
- Hono behind private network (VPC) with SvelteKit as the only public
  frontdoor? (preferred for defense-in-depth)
- Or keep public with firewall rules + relying on better-auth's built-in
  `rateLimit` (now active) + `trustedOrigins`?

**Status:** 🔲 pending product/infra decision. Not blocking dev.

### 5.5 Sign-up doesn't auto-sign-in

After successful sign-up, dashboard redirects to `/sign-in` instead of
the authenticated route. `better-auth.signUp.email` returns a session
by default (`emailAndPassword.autoSignIn: true`), but the sign-up form
action discards the Set-Cookie headers.

**Fix:** apply the same Set-Cookie forwarding pattern as sign-in. Then
redirect to `/`. ~10 lines.

**Status:** 🔲 pending. Low priority but easy win.

### 5.6 HTML5 client validation on password

`<input type="password" required>` — no `minlength="8"`. Server-side
better-auth rejects (`minPasswordLength: 8`) but the user pays a roundtrip.

**Status:** 🔲 trivial fix when touching the form UI again.

### 5.7 Form action verb naming consistency

Already aligned to `auth.<flow>.<event>` after the 2026-05-09 logging
refactor. Documented in §3.4 — consider this resolved.

---

## 6. Built-ins toggle table

| Feature | Activate via | Status |
|---|---|---|
| CSRF / Origin check | `trustedOrigins: env.ORIGIN_ALLOWED` | ✅ active |
| Cookie cache HMAC | `session.cookieCache.enabled = true` (5 min) | ✅ active |
| Rate limit | `rateLimit.{enabled, customRules}` | ✅ active (sign-in 5/min, sign-up 3/h) |
| Email verification | `emailVerification.sendVerificationEmail` | 🔲 not configured |
| 2FA | `plugin twoFactor()` | 🔲 not needed yet |
| Cross-subdomain cookies | `advanced.crossSubDomainCookies.enabled = true` | 🔲 only when `auth.X` + `app.X` deployment |
| Secure cookies in prod | `useSecureCookies: true` (or auto via HTTPS in `BETTER_AUTH_URL`) | 🔲 verify in prod |

---

## 7. Performance notes — cookieCache

`session: { cookieCache: { enabled: true, maxAge: 60 * 5 } }`

Validation flow with `auth.api.getSession()` (and `getCookieCache`
mirrors locally):

1. Read `better-auth.session_token` cookie
2. Verify HMAC of session data cached in cookie (no DB)
3. Cache fresh? → return session from cache (typically < 1 ms)
4. Cache stale? → DB query, refresh cache as side-effect

Most requests validate via HMAC alone. DB load mitigated by 5-min TTL.

In SvelteKit dashboard's `sessionHandle`, the local `getCookieCache(secret)`
call performs the same HMAC validation **without** importing the auth
instance — works because `BETTER_AUTH_SECRET` is shared between API and
dashboard.

---

## 8. References

- [better-auth — SvelteKit integration](https://better-auth.com/docs/integrations/svelte-kit)
- [better-auth — rate limit](https://better-auth.com/docs/concepts/rate-limit)
- [better-auth — cookies](https://better-auth.com/docs/concepts/cookies)
- Inspected source: `node_modules/better-auth/dist/integrations/svelte-kit.mjs`
- Inspected source: `node_modules/better-auth/dist/cookies/cookie-utils.mjs`
- Inspected source: `node_modules/better-auth/dist/api/routes/session.mjs`
- [Hono RPC client](https://hono.dev/docs/guides/rpc) — confirms `/auth/*` opaque is not typeable through hono/client
- SvelteKit cookie default encode: `node_modules/@sveltejs/kit/src/runtime/server/cookie.js` line 214 (`encodeURIComponent`)
