# Varredura completa — 2026-10-11

> Branch `alpha/eco-system-v2` (96 commits à frente de `main`). Estado medido
> hoje: typecheck **13/13**, biome **5 erros conhecidos**, testes **70 pass /
> 0 fail** (6 tasks). E2E não executado.
> Método: 4 auditorias read-only (api, dashboard, packages, infra/docs). Os
> itens 🔴 de bug foram re-conferidos no código antes de entrar aqui.
> **Card único do backlog** (consolidado em 2026-10-12): absorve os itens
> abertos de `boilerplate-gaps-audit.md`, `health-and-upgrade-audit.md` e
> `observability-followups.md` (movidos para `tasks/done/`). Fora daqui só a
> migração Paraglide (`i18n-paraglide-migration.md`), parada de propósito.
> Execução por fases no fim do documento — **um commit verificado por fatia**.

---

## 🆕 Pedidos do dono (2026-10-11)

### N1. Renomear `apps/api` → `apps/dashboard-api`

Mais semântico: a API existe para servir o dashboard.

Raio do rename (fora de `bun.lock`, `tasks/done/` e `study/`):

| Onde | O quê |
| --- | --- |
| `apps/api/package.json:2` | `"name": "api"` → decidir o nome (ver abaixo) |
| `apps/api/dofigen.yml` (+ `dofigen.lock`, `Dockerfile` gerado) | `apps/api/package.json`, `workdir /app/apps/api`, binário `/app/apps/api/api` |
| `apps/api/.dockerignore:5` | `/apps/api/.env*` |
| `.gitignore:271` | `apps/api/api` (binário compilado) |
| `turbo.json:10` | output `"api"` (nome do binário) |
| `infra/docker/docker-compose.test.yml:1-3` | comentários apontando para `apps/api/test/e2e/run.ts` |
| `apps/api/src/server.ts:14` | comentário citando `apps/api/.env.example` |
| `apps/api/.env.example:18,25` | `SERVICE_NAME=api` — vira `service` em **todo** log, `service.name` no Tempo e `job` no Prometheus |
| `CLAUDE.md`, `README.md`, `apps/api/test/README.md`, `tasks/todo/*` | caminhos e tabela de layout |

Não mexer: `apps/api/src/main/infra/openapi/utils.ts:1` — é o link de crédito
para o repo da Unkey, não um caminho nosso.

**Decidido (2026-10-11):**
- Nome do pacote: **`@app/dashboard-api`**, simétrico ao `@app/dashboard-svelte`.
  Atualizar todo `--filter`/referência a `api` do turbo.
- `SERVICE_NAME` → **`dashboard-api`** (e `OTEL_SERVICE_NAME` comentado no
  `.env.example`). Aceita-se a quebra das queries salvas com `service_name=api`;
  atualizar exemplos em docs/tasks que citam `service.name=api`.
- Binário compilado: segue o nome do app (`dashboard-api`) — `turbo.json`
  outputs, `.gitignore`, `dofigen.yml`.

**Aceite:** `git grep -n "apps/api"` só retorna `tasks/done/` e o crédito da
Unkey; typecheck/lint/test iguais ao baseline; `bun run dev` sobe as duas apps;
`bun run test:e2e` verde; Dockerfile regenerado via dofigen.

> Fazer **antes** de corrigir o Dockerfile (item 🔴 4) — ele será regenerado de
> qualquer forma.

### N2. API sem domínio no banco — por design

Hoje a API usa o Postgres só para auth (adapter Drizzle do better-auth) e para
o `/ready` (`pingDatabase`). O schema em `packages/db/schema/` tem só as 4
tabelas do better-auth (`User`, `Account`, `Session`, `Verification`). As três
rotas v1 (`stats`, `customers`, `employees`) são mock.

**Isto é deliberado:** o modelo de dados varia de usuário para usuário; o
template entrega o banco de pé (compose, migrations, seed do admin) e quem
forka constrói o próprio domínio.

Consequências a aplicar:
1. O antigo "Toda a v1 é mock" (`tasks/done/boilerplate-gaps-audit.md` §7 e
   roadmap #3) **não é lacuna** — por isso não foi absorvido abaixo.
2. **Registrar em `CLAUDE.md` §5 "Load-bearing oddities"** para nenhum agente
   "consertar" os mocks inventando um domínio.
3. **Documentar o caminho** de quem forka (README): onde criar a tabela em
   `packages/db/schema/`, `db:generate`/`db:migrate`, e como uma rota v1 passa
   do mock para `db` seguindo `schema.ts` + `get.ts` + `index.ts`.

4. **Decidido (2026-10-11): uma rota de exemplo ligada ao banco**, usando só a
   tabela `user` que já existe — nenhum domínio novo. Proposta: `GET /v1/me`
   (`schema.ts` + `get.ts` + `index.ts`, protegida pelo `authMiddleware`,
   lendo via `@pack/db`), consumida pelo dashboard (ex.: página `profile`) com
   `createApiClient` + `safeFetch` + zod. Cobrir no e2e (401 sem sessão, 200
   com o usuário do sign-up). As demais rotas v1 seguem mock.

### N3. Remover menções a Node — repo Bun-first

Objetivo: quem forka não deve tropeçar em ferramenta Node; tudo roda em Bun.

Inventário (fora de `bun.lock`, `study/`, `tasks/`), classificado pelo custo:

**Remoção direta (config/tipos):**
- `mise.toml:3` `node = "26.10.0"` e `package.json:35` `engines.node` —
  confirmar antes que `vite build`, `svelte-check`, `drizzle-kit` e `turbo`
  rodam sem Node no PATH (`bunfig.toml` já força `run.bun = true`).
- `@types/node` em 10 `package.json` + catálogo `catalogs.dev` → `@types/bun`
  já cobre a API `node:*`. `"types": ["bun", "node"]` em
  `packages/observability/tsconfig.json` e `packages/testing/tsconfig.json`.
- `.gitignore` — bloco gerado pelo toptal com `node`, `nextjs`, `vercel`,
  `storybookjs`, `react` (linhas 1-2, 72-258). Reescrever enxuto.
- `biome.json:56` `noNodejsModules: "off"`.
- Comentários: `bunfig.toml:5`, `apps/dashboard/src/lib/logger.ts:6`,
  `packages/cache/src/client.ts:5`, `apps/api/.env.example:28`.
- Docs: `README.md:18,38`, `CLAUDE.md:236`.

**Troca de dependência (cada uma é sua própria fatia):**
- `@sveltejs/adapter-node` → adapter Bun (`svelte-adapter-bun`, comunitário).
  Bônus: o bug 🔴 2 (headers imutáveis do undici no proxy `/auth`) só existe
  no runtime Node. Risco: adapter de terceiro, avaliar manutenção.
  `adapter-node` 6.0 saiu — se ficar, é um major pendente.
- `@opentelemetry/sdk-trace-node` (`NodeTracerProvider`) →
  `sdk-trace-base` + `AsyncLocalStorageContextManager` explícito. Reverificar
  o round-trip do Tempo e o sampling via env (F6) depois.
- `apps/api/test/e2e/{run,helpers/containers}.ts` — `node:child_process`
  `spawnSync` → `Bun.spawnSync`.

**Irredutível — manter (são APIs que o Bun implementa nativamente):**
- `node:async_hooks` (`AsyncLocalStorage` — base do contexto por request),
  `node:stream` (`Writable` do logger/bridge OTel), `node:os`, `node:util`,
  `node:path`, `node:crypto`. Não há equivalente `Bun.*`; o prefixo `node:` é
  o módulo, não o runtime.
- `nodemailer` / `@types/nodemailer` — nome do pacote de SMTP, não runtime.
- `NODE_ENV` — convenção universal de env, lida pelo better-auth e pelo Vite.

**Decidido (2026-10-11): manter `@sveltejs/adapter-node`.** A troca de
adapter sai do escopo; o adapter oficial fica, e o bug 🔴 2 precisa de
correção no código (não "some" com Bun). Seguem no escopo: config/tipos/docs,
a troca do `NodeTracerProvider` e o `Bun.spawnSync` nos e2e.

Como o build de produção do dashboard continua rodando em Node, **manter o
`node` no `mise.toml`/`engines`** até verificar que nada mais depende dele
além do adapter — se o runtime de prod é Node, a paridade local exige Node.

**Aceite:** `git grep -n -i -E "\bnode\b|nodejs|@types/node"` retorna só a
lista "irredutível" + `adapter-node` e o pin de Node que ele exige; baseline
verde; dashboard sobe em dev e no build de produção.

### N4. Completar as telas da sidebar (hoje são rasas)

Todas as rotas da sidebar existem (`ac83234`, `98aac6d`, `02a51ae`,
`86d6968`), mas são só leitura e mínimas. Estado e o que falta:

| Tela | Hoje | Falta |
| --- | --- | --- |
| Dashboard `/{locale}` (125 linhas) | 3 cards de stats + atividade recente, de `/v1/stats` (mock) | estados vazio/erro/loading (`skeleton`), gráfico ou série temporal, links dos cards para as telas |
| Customers (85 linhas) | lista à mão de `/v1/customers` (mock: id, name, email, status, createdAt) | `table` com ordenação, busca, filtro por `status`, paginação (API recebe `?page&limit&q`), tela de detalhe `/customers/[id]` (`GET /v1/customers/{id}`), status traduzido (hoje sai cru no badge) |
| Employees (84 linhas) | idem, `/v1/employees` (mock) | mesmo pacote de Customers, reaproveitando os componentes |
| Settings (79 linhas) | aparência, idioma, e-mail da conta em badge | editar nome (`updateUser`), trocar senha (`changePassword`), sessões ativas + revogar (`listSessions`/`revokeSession`), zona de perigo (sair de todas as sessões / excluir conta) com `alert-dialog` |
| Profile (63 linhas) | nome, e-mail, id, avatar | ligar no `GET /v1/me` (N2); hoje repete o bloco "conta" do Settings |

**Pré-requisitos no design system** (G4):
`table`, `card`, `pagination`, `dialog`/`alert-dialog`, `form`/`label`,
`toast` (`svelte-sonner` já está no catálogo, sem uso). Fazer os componentes
primeiro, numa fatia própria, e só então as telas.

**Comum a todas:** `<title>` por página, breadcrumb com links reais (hoje
`href="#"` em `header.svelte:32`), chaves de i18n em `en`/`pt`/`es`, loads com
`createApiClient` + `safeFetch` + zod, sem lista montada à mão.

**Decisões em aberto:**
- Customers/Employees continuam mock (N2). As telas ficam **só leitura**
  (lista + busca + paginação + detalhe) ou ganham **CRUD sobre o mock**
  (POST/PATCH/DELETE que não persistem)? Recomendação: só leitura — CRUD sem
  banco ensina um padrão falso; quem forka cria o CRUD real sobre o próprio
  schema, seguindo o `/v1/me`.
- Profile vs Settings: fundir (Profile = dados pessoais editáveis, Settings =
  preferências + segurança) ou manter como está?

**Aceite por tela:** renderizada e conferida no browser nas 3 locales, com
estados vazio e erro exercitados; `svelte-check` 0 erros; nenhum texto sem
tradução.

---

## 🔴 Bugs e segurança (achados da varredura)

1. **Logout forçado a cada ~5 min.** `(authenticated)/+layout.server.ts:6`
   redireciona se `locals.session` é nulo, mas ele só vem do cookie cache
   (`maxAge: 60*5`, `packages/auth/src/server.ts:16`). O fallback de
   `hooks.server.ts:127` (`getSessionCookie`) é anulado pelo layout, e nada
   renova o cache: `createApiClient` e o fetch do layout descartam o
   `Set-Cookie` da API.
2. **Proxy `/auth/*` do dashboard → 500 sob Node.** `hooks.server.ts:49` faz
   `response.headers.set` num `Response` de `fetch` (headers imutáveis no
   undici). Reproduzido com `node build`. Bun não quebra, mas o adapter-node
   fica (N3) → corrigir criando um `new Response(body, { headers })` mutável.
3. **Rate limit do login ineficaz.** Sem `rateLimit` no better-auth: default
   só em `production`, storage em memória por processo, IP do primeiro
   `x-forwarded-for` (forjável); sem header → IP `null` → limite pulado. O
   dashboard (`auth-proxy.ts:34`) não repassa o IP do cliente. Corrigir com
   `rateLimit` + storage Redis (`@pack/cache`) + `advanced.ipAddress`.
4. **Dockerfile da API provavelmente não builda** (leitura, não buildado):
   `--frozen-lockfile` sem montar `bun.lock`; não monta
   `apps/dashboard/package.json`; `linker = "isolated"` mas só copia
   `/app/node_modules`. Imagem em **bun 1.3.14** (`dofigen.lock`) vs 1.4.2 no
   `mise.toml`.
5. **`db:reset` sem guarda real.** `reset-db.ts:5` só checa
   `NODE_ENV === 'local'`, que o próprio `packages/db/.env` define e o Bun
   auto-carrega. `DATABASE_URL` de prod no shell passa. Checar host/nome do
   banco. (Typo "eeset" na linha 10.)
6. **Seed inseguro** (`admin.seed.ts`): fallback `admin@example.com`/`admin`
   (abaixo do `minPasswordLength: 8`), loga a senha em claro (`:34`), inserts
   sem transação (user sem credential em re-run), `seed/index.ts:13`
   `.catch(console.error)` sai com 0.
7. **XSS latente em `@pack/seo`** — `json-ld.ts:14` é `JSON.stringify` puro
   dentro de `{@html <script>}`; `</script>` num valor escapa. Escapar `<`,
   `>`, `&`, U+2028/2029.

## 🟡 Médio

- `route` no log é sempre `/*` (`observability.ts:46` lê `routePath` antes do
  `next()`); o access log não tem path. `ip` confia em `cf-connecting-ip` /
  `x-forwarded-for` sem proxy confiável.
- Shutdown: `server.stop()` não aguardado (`graceful-shutdown.ts:48`) antes de
  fechar o pool; crash termina com `exit(0)`; grace de 3s.
- Env sem validação: `BETTER_AUTH_SECRET` `min(1)` (aceita o placeholder
  `32-length`); `BETTER_AUTH_URL` com default localhost (desliga secure
  cookies em prod); `NODE_ENV ?? ''` em `apps/api/src/core/env.ts:25`;
  `ORIGIN_ALLOWED` aceita `''`; `API_URL` do dashboard com default; SMTP
  opcional → `port: NaN` só no primeiro envio.
- Limpeza de cookie no 401 usa `startsWith('better-auth.')` e ignora
  `__Secure-better-auth.*` (HTTPS). Bloco copiado em 3 `+page.server.ts`.
- Scrub do Sentry é denylist: `request.data`, `query_string`,
  `x-forwarded-for`, `set-cookie` e breadcrumbs passam.
- Logger sem `redact`; bridge OTel envia `ip`/`user_agent` ao Loki.
- Dashboard sem CSP nem `frame-ancestors` (clickjacking no painel admin).
- `apps/api/.env.example` com credenciais "genergia" que não batem com o
  compose — fork novo não conecta.
- `safeFetch` e o layout engolem erros sem log (regra "no silent fallbacks").

## 🟢 Baixo

- `HOST` parseado e não passado ao `Bun.serve`; `/v1/*` inexistente → 401 em
  vez de 404; `HTTPException` 5xx vaza `err.message`.
- Redirect de locale descarta a query string; `startsWith('/auth')` casa
  `/authors`.
- `<html lang="en">` fixo (`app.html:2`); páginas autenticadas sem `<title>`;
  breadcrumb com `href="#"`.
- Scalar/OpenAPI públicos em prod com server URL fixo em localhost.

## Infra / config

- **Pins fora do catálogo:** 42 versões literais vs 44 `catalog:` — contraria
  `CLAUDE.md` §5. Três duplicam chave do catálogo (`@lucide/svelte`, `pino`,
  `pino-pretty`). `translate` do i18n usa `languine@latest`.
- **Biome ignora** todo o código do design-system (`components/ui`, `lib`,
  `hooks`, `styles`) e `scripts/**`; ignores mortos (`apps/docs`,
  `apps/email`). Sem override para `apps/dashboard/static/**` (favicon).
- **turbo.json:** nenhuma env no hash (`envMode: loose`, sem `env`/`globalEnv`);
  `globalDependencies` aponta para `.env.*local`, que não existe — editar
  `.env` não invalida cache. `test` depende de `^test` sem motivo.
- **Imagens:** `grafana/otel-lgtm:latest` sem pin; `redis:7-alpine` e o
  postgres do test em tag flutuante. `REDIS_PASSWORD=redis` no compose é
  ignorado (a senha real vem do `requirepass`).
- `.claude/settings.local.json` só é ignorado pelo gitignore global — um fork
  pode commitar.
- **Deps:** 32 desatualizadas. Majors: SvelteKit **3.0**, adapter-node **6.0**
  (novos desde 09-30), TypeScript 7, `@sentry/bun` 11, nodemailer 10.
- **Código morto:** `@pack/cache` e `@pack/storage` sem importador;
  `concurrently` e `ws` sem uso; `/health` em `QUIET_PATHS` sem rota;
  `@pack/auth/client.svelte` sem importador (e redireciona sem locale).

## Docs desatualizados

- [x] **Feito (2026-10-12):** `CLAUDE.md` §1 (exceções ao `src/`), §2
  (comandos novos, 6 pacotes com `test`, script quebrado removido), §4 (CI,
  lint 0, 70 pass), §5 (catálogo em `workspaces.catalog`, pins existentes
  admitidos), §8 (aponta para este card, sem contagem de commits que
  envelhece). `README`: `mise.toml`, `@pack/seo` só json-ld, scripts, CI.

---

## 📥 Absorvido de outros cards (2026-10-12)

Só o que segue **aberto**; o que já fechou ficou registrado nos arquivos de
origem, agora em `tasks/done/`.

### De `boilerplate-gaps-audit.md`

- [x] **G1 — CI** (era P0 #1). **Feito (2026-10-12):** lint zerado
  (`80935ea`); `.github/workflows/ci.yml` com job `check` (`biome ci` +
  `turbo typecheck test`) e job `e2e`, bun/node via `mise-action`. Achado no
  caminho: os unitários da API dependiam do `.env` local (falhavam sem ele) —
  corrigido com preload próprio (`0b553b6`). Verificado numa worktree limpa
  sem `.env`: 19/19 tasks; e2e 7/7 local. **Pendente:** o workflow nunca rodou
  no GitHub (branch sem upstream) — conferir na primeira PR. Budget de bundle
  via `ANALYZE=1` (era §15) segue aberto.
- **G2 — Testes do dashboard** (era P0 #3). Lógica pura, sem infra:
  `src/lib/auth-proxy.ts` (`localizeAuthError`, `redactEmail`,
  `userMessageFor`), `src/lib/api/safe-fetch.ts` (erro + zod),
  `packages/i18n/src/format.ts`. Somar: o fix do logout de 5 min (🔴 1) e a
  limpeza de cookie `__Secure-*`.
- **G3 — Fluxos de auth** (era §6). Sign-up com auto-sign-in (hoje redireciona
  para `/sign-in` e descarta o `Set-Cookie`); forgot/reset password (o
  `revokeSessionsOnPasswordReset` já está configurado, falta UI e envio via
  `@pack/email`). **Decisão em aberto:** verificação de e-mail, 2FA e sign-up
  aberto (`disableSignUp`) entram neste card ou ficam fora?
- **G4 — Design system** (era §4). Os necessários para N4: `table`, `card`,
  `pagination`, `dialog`/`alert-dialog`, `form`/`label`, `toast`
  (`svelte-sonner`). Os demais (`alert`, `tabs`, `switch`/`checkbox`/
  `radio-group`, `popover`, `command`, `progress`) só se alguma tela pedir.
  Tirar o código do design system do ignore do biome antes (ver Infra).
- [x] **G5 — Scripts agregados na raiz** (era §8). **Feito (2026-10-12,
  `80b18d0`):** `check`, `typecheck`, `setup`, `test:e2e`, (`check` e
  `typecheck` viraram `verify` e `bun check` + `check:svelte` no Bun 1.4.3),
  `db:generate|migrate|seed|reset|studio` (via `bun --filter`);
  `docker:infra:up --wait` com healthchecks novos no compose. `setup`
  verificado de ponta a ponta. `docker:test:*` não foi criado — o runner do
  e2e já sobe e derruba o compose de teste.
- **G6 — Gestão de env** (era §9). Documentar que `BETTER_AUTH_SECRET` tem de
  bater entre API e dashboard; corrigir o `.env.example` "genergia".
- **G7 — Receita de deploy** (era §10). Dockerfile do dashboard
  (`adapter-node`, decisão N3) + compose prod-like (postgres + api +
  dashboard). Documentar a troca de adapter para quem forka (era §16).
- **G8 — Hardening** (era §11–13). `hono/secure-headers`, `hono/csrf`,
  `hono/body-limit` na API; `kit.csp` + `frame-ancestors` no dashboard;
  better-auth em prod (`useSecureCookies`, `cookieCache.maxAge`).
- **G9 — `/metrics`** (era §14). **Decisão em aberto:** o alvo de deploy usa
  scrape Prometheus ou collector OTLP? Só vira tarefa se for scrape.
- **G10 — Release do template** (era §17) — **sempre o último commit**:
  apagar `tasks/`; tirar `eco-system`/`GRN Group` do código
  (`(unauthenticated)/+layout.svelte:19,24`, `sign-in/+page.svelte:20`,
  `sign-up/+page.svelte:20`, `+error.svelte:47`, `app-sidebar.svelte:51`,
  `packages/observability/pack-env.ts` `SERVICE_NAME` default); decidir
  `screenshots/`; revisar README e CLAUDE.md como quem acabou de clonar;
  confirmar que nenhum `.env` real foi rastreado.

### De `health-and-upgrade-audit.md`

- **H1 — Majors de dependência**, cada um sua própria fatia, nesta ordem:
  `typescript` 6→7 (checar `svelte-check` e `drizzle-kit`), `@sveltejs/kit`
  2→3 + `adapter-node` 5→6, `@sentry/bun` 10→11, `nodemailer` 9→10,
  `@formatjs/intl-localematcher` 0.8→0.9, grupo OTel 0.219→0.223 em lockstep,
  `@scalar/hono-api-reference` 0.11→0.12. Patches (32 no total hoje) num
  commit só, antes dos majors.
- O re-pin do Dockerfile em bun 1.4.2 já está no 🔴 4.

### De `observability-followups.md`

- **O1 (era F3) — Spans de DB** no postgres.js/Drizzle. Faz sentido junto com
  o `/v1/me` (N2): é a primeira rota que toca o banco fora do auth, e a que
  vai provar o span no Tempo.
- **O2 (era F7) — Observabilidade no dashboard**: Sentry + OTel no SvelteKit
  (`hooks.server.ts` já tem `logHandle` e `requestId`), propagação de trace
  dashboard → API.
- **O3 (era F7) — Manifests k8s/HPA** usando o split `/status` vs `/ready`.
  Opcional; depende da G7.
- F4 (`pack-env.ts` sem teste) e o tail sampling do F6 seguem **fora por
  decisão** — ver `tasks/done/sampling-strategy.md`.

---

## 🗺️ Execução por fases

Cada fase fecha com `bun run verify` (biome, `bun check`, `check:svelte`,
`turbo test`; `--force` no turbo para sinal real) no baseline ou melhor, e com a verificação de runtime
que o item pede. Um commit por fatia; docs (`CLAUDE.md`, `README`) atualizados
no mesmo commit da mudança de comportamento.

| # | Fase | Itens |
| --- | --- | --- |
| 0 ✅ | Rede de segurança | zerar lint, **G1** CI, **G5** scripts da raiz, corrigir o drift de `CLAUDE.md`/`README` — feito 2026-10-12 (CI ainda não rodou no GitHub) |
| 1 | Bugs visíveis | 🔴 1 (logout 5 min), 🔴 2 (proxy `/auth` 500) + testes em **G2** |
| 2 | Rename | **N1** `@app/dashboard-api` |
| 3 | Segurança | 🔴 3 rate limit, 🔴 5/6 reset e seed, 🔴 7 json-ld, validação de env, scrub do Sentry, `redact`, `ip` confiável, cookies `__Secure-*`, **G8** hardening |
| 4 | Correção da API | `route` no log, shutdown, `HOST`, 404 vs 401, `HTTPException` 5xx, Scalar em prod |
| 5 | Bun-first | **N3** (tipos/config/docs, `NodeTracerProvider`, `Bun.spawnSync`) |
| 6 | Deploy | 🔴 4 Dockerfile da API em bun 1.4.2 buildado, **G7**, **G6**, pins das imagens |
| 7 | Banco | **N2** `/v1/me` + **O1** spans de DB + doc de como forkar o schema |
| 8 | Design system | **G4** |
| 9 | Telas | **N4** + **G3**, uma tela por fatia: Settings → Profile → Customers → Employees → Dashboard |
| 10 | Observabilidade do dashboard | **O2**; **O3** opcional |
| 11 | Dependências | patches, depois **H1** um major por fatia |
| 12 | Higiene | pins fora do catálogo, ignores do biome, hash de env no turbo, código morto |
| 13 | Release | **G10** — último commit |

Fases 0–1 primeiro: sem CI, o resto é mudança sem rede. A fase 11 fica depois
das telas para não brigar com SvelteKit 3 no meio do N4.
