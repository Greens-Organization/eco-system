# Eco-System v2 — CLAUDE.md

## Overview

SaaS monorepo in active development, inspired by [next-forge](https://www.next-forge.com/) but progressively decoupled from the Next.js ecosystem.
The backend runs on **Hono** (Bun runtime). The frontend has migrated to **SvelteKit** (Svelte 5 + Bun runtime).

- **Package manager:** Bun 1.3.5
- **Orchestration:** Turborepo 2.8.9
- **Lint/Format:** Biome 2.4.2
- **Language:** TypeScript 5.9.3 (strict)
- **Main branch:** `main` | Active branch: `alpha/eco-system-v2`

---

## Structure

```
eco-system/
├── apps/
│   ├── api/        — Hono backend (Bun runtime, OpenAPI + Scalar)
│   └── dashboard/  — SvelteKit frontend + Svelte 5 (Bun runtime)
└── packages/
    ├── auth/               — better-auth + Argon2 + Drizzle adapter
    ├── cache/              — Upstash Redis + BullMQ
    ├── db/                 — Drizzle ORM + PostgreSQL
    ├── design-system/      — bits-ui, Radix, Geist, CVA, TanStack Form (Svelte)
    ├── email/              — Resend + React-Email + Nodemailer
    ├── i18n/               — per-locale dictionaries, locale utils
    ├── observability/      — Pino (logger + parseError)
    ├── payments/           — PLACEHOLDER (no real integration yet)
    ├── rate-limit/         — Upstash sliding window
    ├── seo/                — schema-dts, metadata helpers (framework-agnostic)
    ├── storage/            — Vercel Blob
    ├── testing/            — Vitest + Testing Library
    ├── tools/              — es-toolkit utilities
    └── tsconfig/           — base tsconfigs (bun.json, nextjs.json, react-library.json)
```

### Internal structure — apps/api

```
apps/api/src/
├── core/
│   └── env.ts              — Zod-validated env vars (T3 Env)
├── infra/
│   └── common/
│       └── constants.ts    — CONSTANTS (base routes: /v1, /health, /auth)
├── main/
│   ├── app.ts              — Hono instance, CORS, global middlewares, route mounts
│   ├── setup.ts            — timezone + startup log
│   ├── routes/
│   │   ├── public/         — unauthenticated routes (e.g. health)
│   │   └── v1/             — authenticated routes
│   │       ├── index.ts    — OpenAPIHono, Scalar docs, securitySchemes, AppType export
│   │       └── stats/      — example resource (route definition + handler split by file)
│   ├── middleware/
│   │   └── auth-middleware.ts — better-auth session middleware (currently commented out)
│   └── infra/
│       ├── error-handler.ts
│       ├── graceful-shutdown.ts
│       └── openapi/        — Zod → OpenAPI validation utils
└── server.ts               — entry point: Bun.serve()
```

### Internal structure — apps/dashboard

```
apps/dashboard/src/
├── app.d.ts                — SvelteKit global types (App.Locals, App.PageData)
├── hooks.server.ts         — handle chain: authHandle → localeHandle → sessionHandle → i18nHandle
├── lib/
│   ├── env.ts              — env vars (API_URL etc.)
│   ├── api/
│   │   ├── hono-client.ts  — createApiClient(cookieHeader) → hc<AppType>
│   │   └── safe-fetch.ts   — safeFetch<T>(request) → Result<T>
│   ├── i18n/               — client-side i18n helpers
│   └── components/         — reusable Svelte components
└── routes/
    ├── +layout.server.ts
    ├── +layout.svelte
    ├── +page.server.ts
    └── [locale]/
        ├── (authenticated)/   — protected routes
        │   ├── +layout.server.ts  — verifies session, fetches user via API
        │   ├── +layout.svelte
        │   ├── +page.server.ts
        │   └── +page.svelte
        └── (unauthenticated)/
            ├── sign-in/
            └── sign-up/
```

---

## Main Scripts

```bash
bun dev          # Start all apps in dev mode (Turbo)
bun build        # Full build
bun test         # Tests (Vitest)
bun lint         # Biome check
bun format       # Biome check --write
bun clean        # Remove node_modules (git clean)
bun clean:all    # Deep cleanup via scripts/cleanup.ts
bun tree         # Visualize structure (ignores node_modules, dist, etc.)
```

### API (apps/api)
```bash
cd apps/api
bun dev          # Dev server (hot reload)
bun build        # Compile to single binary (bun compile)
bun db:generate  # Generate Drizzle migrations
bun db:migrate   # Run migrations
bun db:studio    # Drizzle Studio
bun db:seed      # Seed the database
```

---

## Conventions

### Internal packages
- Prefix: `@pack/` (e.g. `@pack/auth`, `@pack/db`)
- Each package has a single responsibility
- Isolation is enforced by package entry points (e.g. `@pack/auth/server` vs `@pack/auth/client.svelte`), not `server-only`/`client-only`

### TypeScript
- Strict mode always on
- Never use implicit `any`
- Config package: `@pack/tsconfig`
- `bun.json` has `verbatimModuleSyntax: true` — valid only in pure Bun projects (e.g. `apps/api`)
- `nextjs.json` — kept for packages that still reference Next.js (e.g. `@pack/email`, `@pack/storage`)
- The dashboard tsconfig maps `@api/*` paths to resolve transitive imports when using `AppType` — keep in sync with the API folder structure

### Validation
- Zod at all boundaries (API inputs, env vars)
- T3 env (`@t3-oss/env-core`) for environment variables

### Code style
- Single quotes, no semicolons, 2 spaces, 80 chars (Biome)
- ES5 trailing commas
- Tailwind class ordering via Biome (clsx, cva, cn, twMerge)

### API (Hono)

- Routes in `apps/api/src/main/routes/`
- Versioning: `/v1/`, `/public/`
- OpenAPI via `@hono/zod-openapi` + docs via Scalar at `GET /v1/`
- Auth via cookie session (`better-auth.session_token`)
- Each resource has split files: `<resource>/index.ts` (router) + `<resource>/get.ts`, `post.ts`, etc. (route definition + handler)
- `AppType` is exported from `routes/v1/index.ts` — used by the dashboard to type the RPC client

### Dashboard (SvelteKit)

- Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`)
- `hooks.server.ts` is the central entry point: proxies `/auth/*` → API, locale detection, session guard, i18n dictionary loading
- Route groups: `(authenticated)/` for protected routes, `(unauthenticated)/` for sign-in/sign-up
- All routes are prefixed with `[locale]` — never redirect without including the locale
- `App.Locals` (in `app.d.ts`) carries: `locale`, `session` (cookie string or null), `dictionary`
- `App.PageData` carries: `locale`, `dictionary`, `user` (optional, set by the authenticated layout)
- Use `$lib/` alias for `src/lib/` — always prefer it over long relative paths

### Auth (better-auth)

- Auth handler runs on the **Hono API** at `/auth/*` — never on the dashboard
- `hooks.server.ts` (`authHandle`) fetches `/auth/*` → `API_URL/auth/*` directly (API URL is never exposed to the browser)
- `@pack/auth/client.svelte` exports `authClient` (reactive Svelte stores via `better-auth/svelte`) + `Session`/`User` types
- `@pack/auth/server` exports `auth` (better-auth instance with Drizzle adapter)
- `@pack/auth/cookies` exports `getSessionCookie` — used in `hooks.server.ts` to read the session cookie
- In server-side load functions, session is read from `event.locals.session` (already resolved by `sessionHandle`)
- For full user data, fetch `API_URL/auth/get-session` with the forwarded cookie header
- `nextCookies()` plugin in `@pack/auth/server` is a no-op in the Hono context — harmless, will be removed later

### Hono RPC Client (dashboard)

- `createApiClient(cookieHeader: string)` in `$lib/api/hono-client.ts` — takes the cookie header and returns a typed `hc<AppType>` with automatic forwarding
- Call inside `load` functions or actions, passing `request.headers.get('cookie') ?? ''`
- `safeFetch<T>(request)` in `$lib/api/safe-fetch.ts` → `Result<T>` (`{ success: true, data }` | `{ success: false, error, status }`)
- **Do not use** `InferResponseType` with `@hono/zod-openapi` — types don't propagate correctly through `.openapi()`
- To type responses, use `z.infer<typeof schemaRes>` and pass it explicitly to `safeFetch`

---

## Current State — Work in Progress

The project is in active evolution. Open items are expected and part of the process:

- `@pack/payments` — placeholder, no Stripe integration yet
- Auth middleware in the API is commented out (`v1.use('/*', authMiddleware)`)
- `@pack/auth/server` uses `nextCookies()` — legacy plugin, no effect on Hono, remove later
- `@pack/auth/client.ts` uses `better-auth/react` — legacy, use `client.svelte.ts` in the dashboard
- `@pack/email` and `@pack/storage` still depend on `@t3-oss/env-nextjs` — migrate to `env-core` later
- Potential overlap between `@pack/cache` and `@pack/rate-limit` (both Upstash) — consolidate later
- `packages/tsconfig/nextjs.json` kept for packages that still reference Next.js

**Do not question or attempt to "fix" open items without explicit instruction.**

---

## What to Avoid

- Never use `npm` or `yarn` — always `bun`
- Never add dependencies without checking the catalog in the root `package.json`
- Never create documentation files (`.md`) beyond those already existing, unless requested
- Never refactor code outside the task scope
- Never add comments or docstrings to code that wasn't changed
- Never use `any` in TypeScript
- Never commit without explicit instruction from the user
- Never create Next.js server actions — the dashboard uses SvelteKit `Actions` in `+page.server.ts`
- Never reference `proxy.ts` or `instrumentation.ts` — they are removed Next.js artifacts

---

## References

- Orchestration and workflow: `.prompts/orchestration.md`
- Tasks and progress: `tasks/todo.md`
- Lessons learned: `tasks/lessons.md`
