# Eco-System v2 — CLAUDE.md

## Visão Geral

Monorepo SaaS em evolução, inspirado no [next-forge](https://www.next-forge.com/), mas progressivamente desvinculado do ecossistema Next.js.
O backend migrou para **Hono** (Bun runtime). O frontend ainda é **Next.js**, mas a dependência está sendo reduzida.

- **Package manager:** Bun 1.3.5
- **Orquestração:** Turborepo 2.8.9
- **Lint/Format:** Biome 2.4.2
- **Linguagem:** TypeScript 5.9.3 (strict)
- **Branch principal:** `main` | Branch ativa: `alpha/eco-system-v2`

---

## Estrutura

```
eco-system/
├── apps/
│   ├── api/        — Backend Hono (Bun runtime, OpenAPI + Scalar)
│   └── dashboard/  — Frontend Next.js 16 + React 19
└── packages/
    ├── auth/               — better-auth + Argon2 + Drizzle adapter
    ├── cache/              — Upstash Redis + BullMQ
    ├── db/                 — Drizzle ORM + PostgreSQL
    ├── design-system/      — Base UI, Radix, Geist, CVA, TanStack Form
    ├── analytics/          — PostHog + Vercel Analytics + Google Analytics
    ├── email/              — Resend + React-Email + Nodemailer
    ├── feature-flags/      — flags + Vercel toolbar
    ├── i18n/               — next-international (dictionaries por locale)
    ├── next-config/        — NextConfig compartilhado
    ├── observability/      — Pino (logger + parseError)
    ├── payments/           — PLACEHOLDER (sem integração real ainda)
    ├── rate-limit/         — Upstash sliding window
    ├── security/           — Arcjet + NoseCone
    ├── seo/                — schema-dts, metadata helpers
    ├── storage/            — Vercel Blob
    ├── testing/            — Vitest + Testing Library
    ├── tools/              — es-toolkit utilities
    └── tsconfig/           — tsconfigs base (nextjs, bun, react-library)
```

---

## Scripts Principais

```bash
bun dev          # Inicia todos os apps em modo dev (Turbo)
bun build        # Build completo
bun test         # Testes (Vitest)
bun lint         # Biome check
bun format       # Biome check --write
bun clean        # Remove node_modules (git clean)
bun clean:all    # Limpeza profunda via scripts/cleanup.ts
bun tree         # Visualiza estrutura (ignora node_modules, dist, etc.)
```

### API (apps/api)
```bash
cd apps/api
bun dev          # Dev server
bun build        # Compila para binário único (bun compile)
bun db:generate  # Gera migrations Drizzle
bun db:migrate   # Executa migrations
bun db:studio    # Drizzle Studio
bun db:seed      # Seed do banco
```

---

## Convenções

### Pacotes internos
- Prefixo: `@pack/` (ex: `@pack/auth`, `@pack/db`)
- Cada pacote tem responsabilidade única
- Usar `server-only` / `client-only` para separar contextos

### TypeScript
- Strict mode sempre ativado
- Nunca usar `any` implícito
- Pacote de configs: `@pack/tsconfig` (renomeado de `typescript-config`)
- `nextjs.json` extende `bun.json` — flags incompatíveis com Next.js são explicitamente desativados:
  `verbatimModuleSyntax: false`, `noUncheckedIndexedAccess: false`, `allowImportingTsExtensions: false`
- `bun.json` tem `verbatimModuleSyntax: true` — válido apenas em projetos pure Bun (ex: `apps/api`)
- Não adicionar `"use server"` em arquivos que exportam objetos/constantes — só em arquivos de server actions (funções async)

### Validação
- Zod em todas as fronteiras (API inputs, env vars)
- T3 env (`@t3-oss/env-core` ou `@t3-oss/env-nextjs`) para variáveis de ambiente

### Estilo de código
- Aspas simples, sem ponto-e-vírgula, 2 espaços, 80 chars (Biome)
- Trailing commas ES5
- Ordenação de classes Tailwind via Biome (clsx, cva, cn, twMerge)

### API (Hono)
- Rotas em `apps/api/src/main/routes/`
- Versioning: `/v1/`, `/public/`
- OpenAPI com `@hono/zod-openapi` + docs via Scalar em `GET /v1/`
- Auth via cookie session (`better-auth.session_token`)

### Dashboard (Next.js)
- App Router com `[locale]/(authenticated)/` para rotas protegidas
- Server actions em `apps/dashboard/actions/`
- Client HTTP tipado via Hono RPC (`hc<AppType>`) em `apps/dashboard/lib/api/hono-client.ts`
- i18n obrigatório: `getDictionary(locale)` em todas as pages
- `proxy.ts` é o middleware — faz rewrite de `/auth/*` para a API e protege rotas autenticadas
- `instrumentation.ts` exporta `function register() {}` vazio — Sentry removido, manter para compatibilidade futura
- O tsconfig do dashboard mapeia paths internos da API (`@/core/*`, `@/infra/*`, `@/main/*`) para resolver imports transitivos ao usar `AppType` — manter sincronizado com a estrutura de pastas da API

### Auth (better-auth)
- Handler de auth roda na **API Hono** em `/auth/*` — não no Next.js
- `proxy.ts` faz `NextResponse.rewrite` de `/auth/*` → `API_URL/auth/*` (URL da API nunca exposta ao browser)
- `authClient` (browser) usa `basePath: '/auth'` sem `baseURL` — funciona via rewrite transparente
- Em server actions, usar `auth.api.getSession({ headers: await headers() })` de `@pack/auth/server`
- `@pack/auth/cookies` re-exporta `getSessionCookie` do better-auth (já lida com nomes dev/prod)
- Não criar helper `getServerSession` — não necessário nessa arquitetura

### Hono RPC Client (dashboard)
- `hono-client.ts` **não tem** `"use server"` — `api` é um objeto, não uma server action
- Cookie forwarding automático via custom `fetch` no `hc`
- Para tipar responses, usar `z.infer<typeof schemaRes>` e passar explicitamente ao `safeFetch`:
  `safeFetch<MyType>(api.resource.$get())`
- **Não usar** `InferResponseType` com `@hono/zod-openapi` — não propaga tipos corretamente via `.openapi()`

---

## Estado Atual — Em Manutenção

O projeto está em evolução ativa. Itens ainda em aberto são esperados e fazem parte do processo:

- `@pack/payments` — placeholder, sem Stripe ainda
- Auth middleware na API está comentado (`v1.use('/*', authMiddleware)`)
- Possível duplicação entre `@pack/cache` e `@pack/rate-limit` (ambos Upstash) — consolidar futuramente
- Alguns pacotes ainda acoplados ao Next.js (`@pack/next-config`, `@pack/seo`, `@pack/i18n`) — desacoplamento progressivo
- `packages/tsconfig/base.json` removido, substituído por configs específicas (`bun.json`, `nextjs.json`, `react-library.json`)

**Não questionar nem tentar "consertar" itens em aberto sem instrução explícita.**

---

## O que Evitar

- Não usar `npm` ou `yarn` — sempre `bun`
- Não adicionar dependências sem verificar o catalog em `package.json` (raiz)
- Não criar arquivos de documentação (`.md`) além dos já existentes, a menos que solicitado
- Não refatorar código fora do escopo da tarefa
- Não adicionar comentários ou docstrings em código que não foi alterado
- Não usar `any` em TypeScript
- Não commitar sem instrução explícita do usuário

---

## Referências

- Orquestração e workflow: `.prompts/orchestration.md`
- Tarefas e progresso: `tasks/todo.md`
- Lições aprendidas: `tasks/lessons.md`
