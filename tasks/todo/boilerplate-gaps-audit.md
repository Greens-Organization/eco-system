# Boilerplate Gaps — Audit & Roadmap

> Audit date: 2026-05-10.
> Scope: full repo sweep (apps/api, apps/dashboard, packages/*, tooling, CI, docs).
> Status: **Backlog** — no implementation yet. Use this to prioritize follow-up work.

---

## TL;DR

The auth, observability, i18n, theme, and monorepo foundations are
mature — better than 80% of SvelteKit boilerplates on GitHub. The
gaps that hurt forkers most are:

1. **README is one line** — onboarding nightmare
2. **Zero tests, zero CI** — first PR can break anything silently
3. **Seven empty/skeleton packages** — `cache`, `rate-limit`, `storage`,
   `payments`, `seo`, `email`, `testing` — promise features the
   boilerplate doesn't deliver
4. **Sidebar links to pages that don't exist** (`/profile`, `/settings`)
5. **Design system missing 10+ common components** for a dashboard

The rest is polish.

---

## 🔴 P0 — Foundational (would fix first)

### 1. Tests + CI

Current:
- `vitest@4.1.5` in devDeps but **no `*.test.*` / `*.spec.*` files** anywhere
- `.github/` has `CONTRIBUTING.md`, `SECURITY.md`, issue templates — **no `workflows/`**

Add:
- `.github/workflows/ci.yml` — matrix run of `lint + typecheck + test + build` on PR / push
- Per-package smoke tests for the critical helpers:
  - `apps/dashboard/src/lib/auth-proxy.ts` — `localizeAuthError`,
    `redactEmail`, `userMessageFor`
  - `packages/i18n/format.ts` — `formatCurrency`, `formatNumber`,
    `formatPercent`
  - `apps/api/src/main/middleware/request-logger.ts` — middleware
    contract
- Playwright baseline covering sign-in → dashboard → sign-out flow

Estimate: ~4-6h. Highest leverage of any item here.

### 2. README with quick start

Current: literally one line `# Eco System (Template)`.

Add (single page, scannable):
- Prerequisites (Bun version, Node, Postgres)
- Quick start (`git clone` → `bun install` → `bun db:push` →
  `bun db:seed` → `bun run dev`)
- Project structure (apps + packages, what each does)
- Common commands cheatsheet
- Env variables reference (or link to `.env.example` files + the
  `BETTER_AUTH_SECRET` cross-app constraint)
- Deploy notes (which adapters are wired, what to set in prod)

Estimate: ~1-2h. Forkers feel this every single time.

### 3. Empty / skeleton packages — decide

| Package | Current state | Recommendation |
|---|---|---|
| `@pack/cache` | empty | Implement (`get/set/del/clear` over Redis or in-mem fallback) **or** remove |
| `@pack/rate-limit` | empty | better-auth covers `/auth/*`; either expand to `/v1/*` (Hono middleware) or remove |
| `@pack/storage` | `index.ts` 30B | Implement S3/R2 wrapper (`put/get/delete/sign`) or remove |
| `@pack/payments` | empty | Stripe stub (checkout session + webhook + subscription record) or remove |
| `@pack/email` | has `templates/contact.tsx` (React leftover from migration) | Migrate templates to Svelte SSR-render OR isolate React-email and document |
| `@pack/seo` | basic `metadata.ts` + `json-ld.ts` | Add sitemap generator + robots.txt template |
| `@pack/testing` | tiny `index.js` | Test fixtures + reusable matchers + setup helpers |

**Principle**: a half-empty package promising features hurts more
than no package at all. Either implement minimum viable, or remove.

Estimate: 2-4h to triage; per-package implementation varies.

---

## 🟡 P1 — UX gaps in dashboard

### 4. Sidebar links to non-existent routes

`app-sidebar.svelte` lists `Customers`, `Employees`, `Settings`,
plus `user-avatar.svelte` links to `/profile` and `/settings`.
None of these routes exist → 404 on click.

Fix: either create placeholder pages with consistent layout (good
for boilerplate — shows the pattern) or trim the sidebar until
they exist.

Estimate: 30min for placeholders.

### 5. Auth flows incomplete

Already documented in `tasks/completed/auth.md` §5.5 onwards:
- Sign-up doesn't auto-sign-in (drops Set-Cookie, redirects to /sign-in)
- No forgot-password UI (better-auth supports it, no UI)
- No email verification UI
- No multi-session / device management
- No 2FA (better-auth has plugin)

Estimate: 4h for forgot-password + email-verification minimal flow.

### 6. UX details

- `svelte-sonner` is in catalog but never imported — **no toast system**
- `Skeleton` component exists but isn't used in any loading state
- No `+loading.svelte` (SvelteKit 2 supports it — show skeleton
  while load runs; right now you see blank screen during transitions)
- Form validation = server roundtrip only. No `zod` + `sveltekit-superforms`
- Theme persists via `mode-watcher` but `<html data-theme>` may FOUC on
  initial SSR — verify
- No empty states for lists (the recent-activity empty state is the
  only one, and it's now i18n'd — establish the pattern elsewhere)

Estimate: 1h for sonner wire-up; 2h for skeleton loading pattern;
4h for full superforms migration.

---

## 🟡 P1 — Design system: 10+ components missing

Current 13: `avatar`, `badge`, `breadcrumb`, `button`, `button-group`,
`dropdown-menu`, `input`, `select`, `separator`, `sheet`, `sidebar`,
`skeleton`, `tooltip`.

For a dashboard boilerplate, missing essentials:

| Component | Why it matters | Source |
|---|---|---|
| `dialog` / `alert-dialog` | every confirm action needs it | bits-ui |
| `toast` | feedback for actions (svelte-sonner already in catalog) | svelte-sonner |
| `table` | every dashboard has tables | shadcn-svelte pattern |
| `card` | universal layout primitive | css only |
| `alert` | inline error/info banners | css only |
| `tabs` | settings pages, multi-section views | bits-ui |
| `switch` / `checkbox` / `radio-group` | forms | bits-ui |
| `popover` | dropdowns beyond menu | bits-ui |
| `command` | command palette (Cmd+K) | bits-ui + cmdk-sv |
| `pagination` | tables need it | css/calc only |
| `progress` / `spinner` | loading states | css only |
| `form` / `label` | with `sveltekit-superforms` for client validation | superforms |

Estimate: ~4h to add the top 5 (dialog, toast, table, form, tabs).

---

## 🟡 P1 — DX gaps

### 7. Aggregated commands

Add to root `package.json`:
- `bun run check` → `lint + typecheck + test` (single command before commit)
- `bun run db:push` → `bun --filter @pack/db x --bun drizzle-kit push --force`
- `bun run db:reset` → reset + push + seed
- `bun run db:seed` → run admin seed
- `bun run setup` → install + db setup + create admin user

Right now forkers have to discover `bun x --bun drizzle-kit ...`
themselves.

Estimate: 30min.

### 8. Env management

4 separate `.env.example` files. `BETTER_AUTH_SECRET` must match
between dashboard and api or sessions silently break.

Options:
- A) Single root `.env.example` documenting everything; dotenv-flow style loader
- B) `setup` script that prompts for shared values and propagates
- C) Document the cross-app dependencies in README

Estimate: 1h for option C; 2-3h for A/B.

### 9. Observability beyond pino

Pino logs are good but missing:
- **OpenTelemetry traces** — cross-tier span correlation
  (we have requestId for grep; OTel for actual distributed tracing)
- **`/metrics` endpoint** — Prometheus-friendly counters
  (request rate, latency p50/p99, error rate by route)
- **Sentry / error-monitoring SaaS hook** in `handleError` —
  gated by `SENTRY_DSN` env var

Estimate: 4h for OTel; 1h for Sentry hook; 2h for `/metrics`.

### 10. Deploy recipe

No `Dockerfile`, no `docker-compose.yml`, no `fly.toml` /
`railway.json` / `vercel.json`. Doc-only or actual configs?

Recommendation: at least
- `Dockerfile.api` + `Dockerfile.dashboard` (multi-stage Bun → adapter-node)
- `docker-compose.yml` for local prod-like (postgres + api + dashboard)
- Brief deploy README pointing at fly.io / railway / Coolify

Estimate: 2-3h.

---

## 🟢 P2 — Security / production hardening

### 11. Hono middleware not wired

`apps/api/src/main/app.ts` doesn't use:
- `hono/secure-headers` — CSP, X-Frame-Options, HSTS
- `hono/csrf` — better-auth covers `/auth/*` via `trustedOrigins`,
  `/v1/*` is unprotected
- `hono/body-limit` — no DoS protection for large payloads

Add with sane defaults. Estimate: 1h.

### 12. SvelteKit CSP

`svelte.config.js` `kit.csp` not set. SvelteKit can generate CSP
hashes for inline styles/scripts automatically.

Estimate: 30min.

### 13. better-auth prod settings

- `useSecureCookies: true` (or auto via `https://` in `BETTER_AUTH_URL`) — verify in prod
- `cookieCache.maxAge: 60 * 5` (5min) — fine for dev, consider lower for high-revocation needs

---

## 🟢 P2 — Performance

### 14. Caching layer

`@pack/cache` empty (see §3). Without it:
- No way to cache API responses (e.g. expensive `/v1/stats`)
- better-auth's `secondaryStorage` not configurable (defaults to DB)
- No request-deduplication

If implementing: Redis adapter with in-memory fallback for dev.

### 15. Bundle size budget

Earlier session installed `bundleStats` plugin (homemade, gated by
`ANALYZE=1`). Wire it into CI to fail on regression beyond a
threshold (e.g. dashboard client bundle > 500KB gzipped).

Estimate: 1h.

### 16. Edge / multi-region

Currently `@sveltejs/adapter-node`. No Cloudflare / Vercel /
Netlify adapter. For boilerplate, optional — but document the
swap recipe.

---

## Ordered roadmap (recommended attack order)

| # | Item | Effort | Value | Notes |
|---|---|---|---|---|
| 1 | README quick-start | 1-2h | 🔴 every fork pays | §2 |
| 2 | CI workflow + 5 unit tests + 1 e2e | 4-6h | 🔴 stops regressions | §1 |
| 3 | Decide 7 empty packages (impl or remove) | 2-4h triage | 🔴 reduces phantom features | §3 |
| 4 | Sidebar route placeholders (or trim) | 30min | 🟡 fixes obvious 404s | §4 |
| 5 | DB / setup scripts on root | 30min | 🟡 onboarding DX | §7 |
| 6 | Add 5 missing UI components | 4h | 🟡 dashboard table-stakes | §6 |
| 7 | Wire svelte-sonner + skeleton loading | 1-2h | 🟡 already in deps | §6 |
| 8 | Dockerfile + docker-compose | 2-3h | 🟡 deploy recipe | §10 |
| 9 | Sentry hook in handleError | 30min | 🟢 obs | §9 |
| 10 | hono/secure-headers + csrf + body-limit | 1h | 🟢 prod hardening | §11 |
| 11 | Sign-up auto-sign-in + forgot-password UI | 4h | 🟢 auth completeness | §5 |
| 12 | OpenTelemetry traces | 4h | 🟢 SRE-ready | §9 |
| 13 | size-limit in CI | 1h | 🟢 perf regressions | §15 |
| 14 | Edge adapter swap recipe (docs) | 1h | 🟢 deploy flexibility | §16 |

**Suggested first sprint** (1 week of focused work):
items 1, 2, 3, 4, 5 — gets the boilerplate from "promising but raw"
to "ready to fork and ship".

---

## What's already strong (don't touch)

For context — these areas are mature, not in scope:

- Auth subsystem (`tasks/completed/auth.md`) — cookieCache, URL-encode
  fix, structured logging, cross-tier `requestId` correlation
- Observability — pino TTY auto-detect, child loggers, request
  middleware on both sides
- i18n — eager dicts, formatters, full auth-error localization,
  full reload on locale change
- Theme — destructive contrast fixed, dark mode cleaner
- Monorepo — Turbo + Bun catalog working, workspace deps sane
- Cold-start perf — lucide per-icon, Vite externalize, @tailwindcss/vite
- Error page — root-level locale-aware 404 with errorId reference

Build on top, don't rebuild these.
