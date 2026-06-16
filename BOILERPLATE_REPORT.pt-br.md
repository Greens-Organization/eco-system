# Relatório de Boilerplate — `eco-system` v2

> Tradução pt-br de [`BOILERPLATE_REPORT.md`](./BOILERPLATE_REPORT.md).

**Branch:** `alpha/eco-system-v2` (reescrita v2 em andamento) · **Generated:** 2026-06-16
**Runtime:** Bun 1.3.14 (pinado, `linker = "isolated"`) · **Build:** Turbo 2.9.11 · **Lint/Format:** Biome 2.4.14 · **TS:** 6.0.3
**Method:** varredura completa do codebase por 6 agentes de investigação em paralelo (apps, packages, infra, tasks, estado do git), com verificação cruzada contra o código-fonte.

Este é um relatório **descritivo** — o que o boilerplate *é* e quão maduro cada parte dele está. Para o companheiro prescritivo (correções concretas, modernização), veja `CODE_IMPROVEMENT_REPORT.md`.

---

## 1. O que é isto

Um boilerplate de monorepo nativo do Bun, orquestrado por Turbo, para um produto full-stack: uma **API Hono no Bun** (`apps/api`) e um **dashboard SvelteKit + Svelte 5** (`apps/dashboard`), apoiados por **14 pacotes internos** (`@pack/*`) cobrindo auth, db, observability, i18n, design-system, email, payments, cache, storage, rate-limit, seo, tools, testing e o tsconfig compartilhado.

A branch v2 é uma reescrita deliberada que porta uma stack de observability de um repositório de estudo em Fastify para Hono/Bun, levanta um test harness Bun de duas camadas, descarta o Vitest e adiciona empacotamento Docker/dofigen. O trabalho está **funcionalmente concluído e verificado, mas ainda não commitado** — vive como um único grande diff em andamento (veja §7).

### Stack em resumo

| Camada | Escolha |
|---|---|
| Runtime | Bun 1.3.14 (isolated linker, deps exatas, versões do catalog) |
| API | Hono no Bun, factory `buildApp()`, `bun build --compile` |
| Dashboard | SvelteKit, runes do Svelte 5, design system shadcn-svelte |
| DB | postgres.js + Drizzle ORM, migrações via drizzle-kit, IDs com `Bun.randomUUIDv7()` |
| Auth | better-auth (email+senha), argon2id via `Bun.password` |
| Observability | Pino + OpenTelemetry SDK 2.x + `@sentry/bun` (topologia desacoplada) |
| Validação | Zod (convenção de schema `pack-env.ts` compartilhada por pacote) |
| Orquestração | pipeline do Turbo; lint/format do Biome em passada única |
| Containers | Dockerfile via dofigen; 3 arquivos compose (infra / observability / test) |

---

## 2. Estrutura do monorepo

```
eco-system/
├─ apps/
│  ├─ api/          Hono no Bun — em camadas (server → buildApp → middleware → routes)
│  └─ dashboard/    SvelteKit — rotas agrupadas por locale, grupos de auth, design-system
├─ packages/        14 pacotes @pack/* (veja §5)
├─ infra/docker/    docker-compose.{infra,observability,test}.yml
├─ tasks/           todo / in-progress / done — sistema de planejamento em markdown
├─ memory/          estado persistente do agent-md (progress.md é a fonte autoritativa)
├─ turbo.json, bunfig.toml, biome.json, package.json (raiz do workspace)
└─ CLAUDE.md        diretivas do agent-md
```

Convenções mantidas em todos os pacotes: **`exports` map**, **`pack-env.ts`** (schema de env Zod), pasta **`tests/` centralizada** (não co-localizada), base **`@pack/tsconfig`** compartilhada. (A uniformidade dessas convenções é, ela mesma, parcial — veja §5 e o relatório de melhorias.)

---

## 3. `apps/api` — Hono no Bun

**Maturidade: fundação sólida, camadas limpas, superfície de features enxuta.**

```
src/server.ts            boot: Bun.serve + graceful shutdown + setup
src/main/app.ts          factory buildApp() + instância padrão
src/main/setup.ts        banner de startup (timezone() é um stub no-op)
src/main/middleware/      observability, auth-middleware, barrel
src/main/infra/           error-handler, graceful-shutdown, openapi/
src/main/routes/public/   status (liveness), ready (readiness), auth (better-auth)
src/main/routes/v1/       OpenAPIHono + docs Scalar + stats (dados mock)
src/core/env.ts          env validado com Zod (faz merge dos schemas dos pacotes)
```

- **A montagem está correta:** instrumentation importado primeiro (SDK antes do app), ordem dos middleware CORS → requestId → OTel → observability → prettyJSON → routes → `onError`. A factory `buildApp()` viabiliza apps de teste isolados.
- **A migração está completa:** o split `health.ts` → `status.ts`/`ready.ts` e a substituição `request-logger.ts` → `observability.ts` não deixaram **nenhuma referência pendente**.
- **A disciplina de tipos é forte:** nenhum `any`, nenhum `@ts-ignore` em lugar algum de `src/` ou `test/`.
- **A superfície de features é intencionalmente enxuta:** o único endpoint `v1` (`stats`) retorna 100% de dados mock hardcoded — esperado para um boilerplate, sinalizado para não ser confundido com algo real.
- **Pontas soltas:** `setup.timezone()` é um no-op; o `HEALTHCHECK` do Dockerfile usa `curl` (ausente na base `oven/bun`); os scripts `docker:infra:*` apontam para um `docker-compose.local.yml` inexistente; `apps/api/docker-compose.yml` e `.dockerignore` são placeholders de 0 byte.

### Ambiente de testes (a adição de destaque)

Um harness **de duas camadas** genuinamente robusto:

- **Unit** (`test/unit`, `bun test --preload @pack/testing/preload`) — sem Docker. Baseado em DI (`createReadyRoute(deps)`), `mock-db` via `mock.module`, mantém-se fora de `@pack/db`/`@pack/auth`. **10/10 passando.**
- **E2E** (`test/e2e/run.ts`) — orquestrador: `compose up --wait` → `bun test test/e2e` (E2E=1) → `compose down` no `finally`. Postgres efêmero em tmpfs (`:5436`), migrate no `beforeAll`, `TRUNCATE … RESTART IDENTITY CASCADE` por teste, fluxo real de sign-up/sign-in do better-auth, factories. **7/7 passando.**
- **Guarda de segurança:** um guard de nome de DB lança erro a menos que `DATABASE_URL` contenha `eco_test`. (Nota: um bug de `=` vs `||=` em `setup.ts:8` atualmente o torna decorativo — veja o item #3 do relatório de melhorias.)

---

## 4. `apps/dashboard` — SvelteKit + Svelte 5

**Maturidade: pequeno, limpo, idiomático — conjunto de features esquelético.**

- **Nenhum resíduo de Next.js** (migração limpa); ~31 arquivos de fonte.
- **Runes do Svelte 5 uniformes** (`$state`/`$derived`/`$props`/`$derived.by`), `$app/state` (não o `$app/stores` deprecado), `Snippet`/`{@render}`, `<script module>` para variantes. Idiomático por toda parte.
- **O split server/client é limpo:** Pino/better-auth nunca vazam para o browser; `hooks.server.ts` compõe `sequence(logHandle, authHandle, localeHandle, sessionHandle, i18nHandle)` corretamente.
- **Roteamento ciente de locale** via grupos de rota `[locale]` + grupos `(authenticated)`/`(unauthenticated)`.
- **Superfície esquelética:** 4 dos 5 links de navegação da sidebar (`/customers`, `/employees`, `/settings`, `/profile`) apontam para rotas que ainda não existem. O fluxo de auth (sign-in/sign-up/sign-out) e o index do dashboard são as únicas páginas vivas.
- **Arestas conhecidas (detalhe no relatório de melhorias):** um contrato Stats declarado em triplicata onde o schema Zod nunca é executado; um fetch `get-session` duplicado que ignora `locals.user`; casts `as string` não-sólidos sobre FormData.

---

## 5. Pacotes — placar de maturidade

14 pacotes. Classificação honesta de maturidade:

| Pacote | Maturidade | Lógica real? | `exports` map | tsconfig | tests | Notas |
|---|---|---|---|---|---|---|
| `observability` | **Maduro** | Sim | ✅ (7 subpaths) | ✅ | ✅ (30/30) | Reorganizado em `errors/logger/context/sentry/`; OTel 2.x + Sentry desacoplados. A referência de estrutura. |
| `i18n` | **Maduro** | Sim | ✅ | ✅ | ❌ | Folha mais completa: resolução de locale, dicionários lazy, formatadores Intl, 3 dicionários. |
| `design-system` | **Maduro** | Sim | ❌ | ✅ | ❌ | O maior: componentes shadcn-svelte, tokens OKLCH, Svelte 5. *É* a referência de UI, mas falta um `exports` map e mistura estilos de código. |
| `db` | **Maduro** | Sim | ❌ | ✅ | ❌ | postgres.js + Drizzle, migrações, seed, `Bun.randomUUIDv7()`. Falta `exports` map apesar de imports por subpath. |
| `auth` | **Maduro** | Sim | ✅ | ✅ | ❌ | better-auth email+senha, argon2id via `@pack/tools`. `BETTER_AUTH_SECRET` validado mas não ligado à config. |
| `testing` | **Maduro** | Sim | ✅ | ✅ | ✅ | preload + runner do Bun; `setTestEnv` (reset parcial de env). |
| `email` | **Implementado** | Sim | ❌ (barrel quebrado) | ⚠ base errada | ❌ | nodemailer + react-email. O barrel usa specifiers nus + um export fantasma `templates/contact` → lança erro no import. |
| `tools` | **Implementado** | Sim | ❌ | ✅ | ❌ | adapter argon2 (usado), uuid-tail, utils de string. Sem `exports`/`main` — bare-import via fallback do Bun. |
| `seo` | **Implementado (órfão)** | Sim | ✅ | ✅ | ❌ | Geradores de metadata + JSON-LD. **Zero importadores** no repo. |
| `storage` | **Wrapper fino** | Não | ❌ | ✅ | ❌ | Re-export puro de passthrough do `@vercel/blob`; `BLOB_READ_WRITE_TOKEN` declarado não usado. |
| `rate-limit` | **Fino** | Mínima | ❌ | ❌ ausente | ❌ | Uma factory Upstash. Env opcional vs tipo de client obrigatório → falha em runtime adiada. |
| `cache` | **Placeholder** | Não | ❌ | ❌ ausente | ❌ | Sem `index.ts`. Apenas `pack-env` (exige `REDIS_URL` rigidamente) + deps (`bullmq`/`ioredis`). |
| `payments` | **Placeholder** | Não | ❌ | ✅ | ❌ | Apenas `package.json` + `tsconfig`. Sem fonte. |
| `tsconfig` | **Maduro** | n/a | n/a | n/a | n/a | Bases `bun.json` + `svelte.json`. Flags modernas; `svelte.json` enfraquece `noUncheckedIndexedAccess`. |

**Resumo:** 6 maduros, 3 implementados (1 órfão, 1 com barrel quebrado), 2 finos, 2 placeholders, 1 base de config.

A lacuna estrutural mais consequente de todas: a **convenção de `exports` map é honrada por apenas ~metade dos pacotes** — e notavelmente *não* pelos dois mais importados (`tools`, `design-system`). Hoje eles resolvem apenas via o fallback de filesystem do Bun.

---

## 6. Infraestrutura & tooling

- **Pipeline do Turbo** coerente; escolha notável: `build.dependsOn: ["^build", "test"]` (o build roda os tests do pacote primeiro). Sem script `typecheck` na raiz embora a task exista no `turbo.json`.
- **O uso de catalog** é limpo e consistente (catalog único + `dev` nomeado); o catalog removido do Vitest **não tem referências pendentes**.
- **Biome** em passada única; os diretórios gerados do shadcn estão na denylist (e portanto não são normalizados — fonte do desvio de estilo no design-system).
- **Docker:** 3 arquivos compose sob `infra/docker/` (infra = pg+redis, observability = Grafana LGTM, test = Postgres efêmero em tmpfs). A dockerização de `apps/api` está em andamento e tem arestas: `docker-compose.yml` vazio, healthcheck baseado em `curl`, e um `dofigen.yml` que vincula um **`packages/analytics` fantasma** (não existe).
- **README** na raiz é um **stub de 1 linha** — a lacuna de documentação mais clara para um repositório template.

---

## 7. Trabalho em andamento (não commitado)

A branch contém **um único grande diff internamente consistente** — 33 arquivos rastreados alterados (+580/−337) mais ~20 caminhos não rastreados — que coletivamente realizam:

- **A.** Reestruturação de `@pack/observability` + wiring de OTel/Sentry (pastas, `exports` map, OTel SDK 2.x, `@sentry/bun`).
- **B.** O ambiente de testes de duas camadas de `apps/api` (toda a árvore `test/`, refactor de `buildApp()`, scripts de teste, devDeps de drizzle/postgres).
- **C.** Infra de raiz/testing: Vitest descartado (dep + catalog), `@pack/testing` migrado de JS→TS + preload do Bun, novos arquivos compose.
- **D.** Dockerização de `apps/api` (Dockerfile, dofigen, `.dockerignore`).

As deleções (`request-logger.ts`, `public/health.ts`, `observability/log.ts`, `testing/index.js`) são **intencionais**, cada uma com uma substituição documentada em `memory/progress.md`. Nada está commitado ainda — a recomendação é **dividir esse blob em commits revisáveis** antes de fazer o land.

### Estado de planejamento & memory

- `memory/progress.md` é **autoritativo e preciso** (bate com o disco, sem referências pendentes). Os demais arquivos de memory (`plan/agents/verify/gotchas.md`) ainda são stubs de template do agent-md não preenchidos.
- `tasks/` usa um sistema markdown `todo/in-progress/done`. Roadmap ativo: `tasks/todo/boilerplate-gaps-audit.md` (auditoria de lacunas P0–P2) — mas ele ainda referencia os caminhos antigos `tasks/completed/` (renomeados para `tasks/done/`) e antecede vários itens agora concluídos.
- Vários docs de tasks concluídas estão escritos mas **não rastreados** (deveriam ser commitados junto com o código que documentam).

---

## 8. Avaliação geral

**Nota: B− — ossatura forte e moderna; consistência e acabamento são a lacuna, não a arquitetura.**

O que é genuinamente bom: uma base nativa do Bun com TypeScript estrito; uma API limpamente em camadas; um test harness robusto de duas camadas verificado de ponta a ponta; Svelte 5 idiomático; uma stack de observability desacoplada. Isto está acima da média para um boilerplate.

O que o impede de estar production-ready:

1. **Desvio de convenção** — `exports` maps, scripts de teste, lançamento de erro e rigor do `pack-env` aplicados de forma desigual entre os pacotes.
2. **Config validada-e-descartada** — `BETTER_AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` computados e nunca usados.
3. **Alguns perigos em tempo de import** — o barrel quebrado de `@pack/email`, o bind fantasma de `analytics` no dofigen, artefatos docker vazios.
4. **Superfície inacabada** — pacotes placeholder (`payments`, `cache`), `seo` órfão, rotas mortas no dashboard, `stats` só com mock, README stub.
5. **Detalhes de segurança** — `memoryCost` do argon2 abaixo da baseline da OWASP; o guard de nome de DB no e2e neutralizado por um deslize de `=`/`||=`.

Nada disto é arquitetural. O boilerplate precisa de **acabamento e aperto**, não de redesenho. O caminho priorizado está em `CODE_IMPROVEMENT_REPORT.md` (os itens 1–9 removem as lacunas genuinamente perigosas e são em sua maioria de baixo esforço).
