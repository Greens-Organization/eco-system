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

### N1. ✅ Renomear `apps/api` → `apps/dashboard-api` (fase 2, 2026-10-12)

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

**Feito:** pasta movida (com o `.env` local), pacote `@app/dashboard-api`,
binário `dashboard-api` (build, `turbo.json`, `.gitignore`, `dofigen.yml`,
Dockerfile regenerado com `dofigen generate --offline`), `SERVICE_NAME` no
`.env.example` e no `.env` local, `--filter` do `test:e2e`, referências do
`tsconfig` raiz, aliases `@api/*` do dashboard, docs. Verificado: `verify`
(11 tarefas), e2e 45/45 pelo filtro novo, API sobe da pasta nova e loga
`service: dashboard-api`. O `git grep "apps/api"` fora de `tasks/` volta vazio.

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

### N3. ✅ Remover menções a Node — repo Bun-first (fase 5, 2026-10-12)

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

**Feito:** `@types/node` → `@types/bun` (catálogo `dev`) em todos os
workspaces e `types: ["bun"]`; `NodeTracerProvider` → `BasicTracerProvider`
+ `AsyncLocalStorageContextManager` + propagador W3C explícitos (provado com
um coletor OTLP falso: o span exportado carrega o `traceparent` recebido, o
log tem o mesmo `trace_id`, e `OTEL_TRACES_SAMPLER=always_off` não exporta);
runner e2e com `Bun.spawnSync` (exit code de falha propaga, containers
derrubados); `.gitignore` reescrito (258 → 47 linhas, mesmo conjunto
ignorado, conferido arquivo a arquivo, + `.claude/settings.local.json`);
comentários de `bunfig.toml`/CI/`mise.toml` explicam por que o Node fica.
`noNodejsModules: off` no biome continua: os módulos `node:*` usados são os
que o Bun implementa.

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

**Decisões:**
- ✅ **Decidido (2026-10-12): só leitura.** Customers/Employees continuam mock
  (N2): lista + busca + paginação + detalhe, sem CRUD sobre o mock — quem
  forka cria o CRUD real sobre o próprio schema, seguindo o `/v1/me`.
- ✅ **Decidido (2026-10-12): Settings dentro de Profile.** O dono pediu menos
  lugares para configurar: `/profile` reúne dados, aparência, idioma, 2FA e
  dispositivos; Settings saiu da sidebar e a rota `/settings` deixou de
  existir (404). O item "Settings" da tabela acima passa a valer para o
  Profile.

**Aceite por tela:** renderizada e conferida no browser nas 3 locales, com
estados vazio e erro exercitados; `svelte-check` 0 erros; nenhum texto sem
tradução.

---

### N5. Maturidade da suíte de testes (avaliada em 2026-10-12)

**Medido:** 77 testes no total, todos passando: 70 unitários em 6 workspaces
e 7 e2e. O e2e roda contra um Postgres efêmero em ~0,7 s. A base é boa: testes
determinísticos, rápidos e sem `.env`, deps injetadas (`/ready`, middleware de
observabilidade), regressões nomeadas (D5 do graceful shutdown) e um harness
e2e que limpa os containers mesmo quando falha.

A cobertura é estreita e engana: o `--coverage` do Bun só lista arquivos que
algum teste importou. Rodado por workspace, mostra auth e db a 100% e a API a
81,7%, mas fora do relatório ficam:

- **API**: `auth-middleware.ts` (protege todo o `/v1`), `app.ts`/`setup.ts`
  (ordem dos middlewares, que define o que é público), as rotas `customers`
  e `employees` (nem o e2e chama), `error-handler.ts` nos ramos de
  `ZodError` e `HTTPException` (linhas 58-68 e 89-97), `openapi/utils.ts` em
  43%. `graceful-shutdown.ts` está em 11%: só o booleano de registro é
  testado, o dreno não.
- **`@pack/auth`**: só o `pack-env`. `server.ts` (config do better-auth:
  cookie cache, argon2, sessão) e `cookies.ts` sem teste. O 🔴 1 (logout em
  5 min) mora nessa fronteira e nenhum teste o pegaria.
- **Sem nenhum teste**: o dashboard (35 arquivos, inclusive o proxy `/auth` do
  🔴 2 e o `safeFetch`), o design-system (105), cache, email, storage, i18n e
  seo (o XSS do 🔴 7 está em `json-ld.ts`).
- **`@pack/db`**: `reset-db.ts` e seed sem teste. Os dois são exatamente os
  🔴 5/6.

Asserções fracas no e2e:

- O sign-up aceita `[200, 201]`.
- A senha curta só exige `>= 400`.
- O `/v1/stats` confere `typeof` em vez de validar com o schema zod da própria
  rota.

Faltam casos e2e de sign-out, de sessão expirada e de cookie adulterado.

Infra de teste:

- Nenhum limite de cobertura (`coverageThreshold`) e nenhuma cobertura no CI.
- O log pino de nível 40/50 vaza no output dos testes de observabilidade. Só
  ruído, mas esconde falhas reais.
- O `turbo test` tem `dependsOn: ["^test"]`, o que serializa sem
  necessidade: teste não consome artefato de teste.
- Layout misto: `apps/api/test/` contra `packages/*/tests/`.
- O comentário do `@pack/testing/src/index.ts` aponta para
  `tasks/todo/observability.md`, que não existe mais.

**Plano.** A regra geral é que cada fase traz os testes do que muda. Nos
itens abaixo, a fase em que cada um entra:

- [x] Fase 1: teste do proxy `/auth` (headers imutáveis) e do layout
  autenticado com cookie cache expirado. Isso abre o G2 no dashboard
  (`bun test` puro sobre `src/lib`, sem Vite).
- [x] Fase 3: testes de `json-ld` (escape de `</script>`), do guard do
  `db:reset`, do seed e do rate limit (e2e, 429).
- [x] Fase 4: `error-handler` nos ramos `ZodError`/`HTTPException` e o dreno
  do graceful shutdown (unitários). O `auth-middleware` ficou coberto no e2e
  (401 sem sessão, 200 com sessão em cada rota, 404 para rota inexistente).
- [x] Fase 4: no e2e, status exatos, shape validado com o schema zod da rota,
  `customers`/`employees`, sign-out e cookie adulterado (`v1.e2e.test.ts`).
- [ ] Fase 7: `/v1/me` no e2e. Testes de cache contra o redis do compose de
  teste.
- [ ] Fase 12:
  - `coverageThreshold` por workspace no `bunfig.toml`, começando pelo valor
    medido para só subir;
  - cobertura no CI;
  - `LOG_LEVEL=silent` no preload;
  - remover o `^test` do turbo;
  - padronizar `test/`;
  - corrigir o comentário do `@pack/testing`.
- [ ] **E2e de navegador (Playwright) no dashboard — no escopo** (decisão do
  dono, 2026-10-12: "garantir tudo funcionando"). Entra na fase 9, junto das
  telas. Testes de componente do design-system seguem fora.

### N6. API escondida do navegador + endurecimento do login (2026-10-12)

**Princípio do dono:** a API do backend fica o mais escondida possível do
frontend. O dashboard é um BFF: só o servidor dele fala com a API, que vive em
rede interna, sem porta publicada nem CORS. Toda tela nova (N4, G3) usa form
action ou load no servidor, nunca `fetch` do navegador para a API.

**Decisões do dono (2026-10-12):** senha mínima 8 **com MFA opcional**; sem
`haveIBeenPwned`; sessão com teto de **24 h**; `SameSite=Strict`; Redis para
rate limit **e** sessões, organizado por namespace. Revogação: escolhi cache
de 60 s (revalidar no Redis é barato) + `cookieCache.version` para invalidação
em massa.

**Pesquisa** (subagente, 2026-10-12): OWASP (cheat sheets de Authentication,
Session, Credential Stuffing, CSRF, Forgot Password, Password Storage), ASVS
5.0 (V3/V6/V7), NIST 800-63B rev4, draft IETF de BFF, doc do better-auth 1.7 e
o código instalado (1.7.6). Fontes em `scratchpad/research/` da sessão.

**PoC:** `apps/api/test/e2e/routes/auth-security.e2e.test.ts` — 10 testes,
escritos antes da correção: **9 falharam** no código original (o único que
passou, "um cliente não bloqueia outro", passava porque não havia limite
nenhum). Depois: 17/17 e2e (23/23 com o 2FA). Os testes do dashboard foram checados por mutação.

Feito (sem commit ainda — o dono pediu os commits no fim):

- [x] **Proxy `/auth/*` removido** (`authHandle`, `proxy.ts`) e o `authClient`
  morto (`client.svelte.ts`). Ele expunha toda a superfície do better-auth
  (`update-user`, `list-sessions`…) e repassava `X-Forwarded-For` do cliente.
- [x] **CORS da API removido.**
- [x] **IP do cliente:** `authFetch` exige `clientIp`
  (`event.getClientAddress()`) e sobrescreve `x-real-ip`; a API lê com
  `advanced.ipAddress.ipAddressHeaders`. Antes, em produção, todo login caía
  num balde só (`no-trusted-ip`): 3 logins/10 s para o site inteiro, e um 429
  no `get-session` virava 503 em todas as rotas.
- [x] **Rate limit** ligado em todo ambiente, `storage: 'secondary-storage'`
  (🔴 3).
- [x] **Redis** como `secondaryStorage` via `createNamespace('auth')`
  (`@pack/cache`): toda chave sob `auth:`, toda chave com TTL; `increment`
  atômico em Lua (INCR + EXPIRE só na criação). Sessões com cópia no Postgres
  (`storeSessionInDatabase`).
- [x] **Sessão 24 h absoluta** (`expiresIn` + `disableSessionRefresh`);
  **cookie cache 60 s**; **`SameSite=Strict`** + `HttpOnly`.
- [x] **Sign-up sem enumeração:** `autoSignIn: false` → e-mail repetido recebe
  a mesma resposta (e não sobra sessão órfã por cadastro).
- [x] **Config de cookie única** (`AUTH_COOKIE`, `readSessionCache` em
  `@pack/auth/cookies`); o dashboard lê `__Secure-…` quando a request é https.
  `BETTER_AUTH_URL` = URL pública do dashboard (https → `Secure` + prefixo).
- [x] `localizeAuthError` não devolve mais a mensagem crua da API.
- [x] Sign-out limpa os cookies mesmo com a API fora do ar.
- [x] `.env.example`: `REDIS_URL` com a senha errada (`genergia_redis` vs
  `eco_system_redis` do compose) — agora fatal, pois a API precisa do Redis
  para autenticar; `ORIGIN_ALLOWED` sem a porta do Grafana.

Verificado em runtime (`node build` + API, 2026-10-12): `/auth/get-session`
no dashboard → 307 para `/en/auth/…` (não proxia); sign-up novo e repetido →
303 idênticos, sem cookie; sign-in → cookies `HttpOnly; SameSite=Strict`,
cache `Max-Age=60`, sessão de 24 h; 4 senhas erradas → `401,401,429,429`;
chaves no Redis só em `auth:*`, todas com TTL; sign-out com a API derrubada →
303 + cookies apagados (`auth.signout.unreachable` no log).

Falta:

- [x] **MFA (TOTP) opcional** — decisão do dono (2026-10-12): cada usuário
  ativa no Perfil. **Trade-off aceito:** quem não ativar fica com senha de 8
  como fator único (o NIST 63B-4 pede 15 nesse caso). Plugin `twoFactor`,
  tabela `two_factor` + `user.two_factor_enabled` (migração `0001`); login em
  duas etapas em `/{locale}/sign-in/two-factor` (TOTP ou código de backup de
  uso único); Perfil → Segurança com QR (SVG no servidor via `uqr`, sem JS),
  chave manual, 10 códigos de backup, confirmar com código, desativar com
  senha. O plugin já bloqueia o 2FA da conta após códigos errados repetidos e
  limita `/two-factor/*` a 3 req/10 s por cliente. Testes:
  `two-factor.e2e.test.ts` (6) + `localizeAuthError` dos códigos novos.
  Verificado em runtime contra containers efêmeros (não no banco de dev), sem
  JS e com Chromium (telas em pt). A sonda achou e corrigi: sem JS, o QR não
  aparecia (estado num `$effect`, que não roda no SSR).
  - Ativar/desativar o 2FA **renova a sessão com 24 h novas** (better-auth
    recria a sessão). Aceito: os dois pedem a senha naquele momento, o que
    equivale a um login novo.
  - Sem "confiar neste dispositivo" (`trustDevice`) por ora: ele pularia o
    2FA por 30 dias.
- [x] **Limite por conta** (NIST 63B-4 §3.2.2, ASVS 6.3.1) — plugin local
  `packages/auth/src/account-throttle.ts` (hooks `before`/`after` em
  `/sign-in/email`). 5 senhas erradas livres por e-mail, depois espera que
  dobra (2 s … 20 min) respondida com o mesmo 429 do rate limit, de qualquer
  IP. Desacelera em vez de travar (trava dura = qualquer um tranca o dono
  fora); e-mails inexistentes contam igual (o 429 não revela contas); Redis
  guarda `auth:login-failures|wait:<sha256 do e-mail minúsculo>` com TTL;
  senha certa (inclusive desafio de 2FA) zera. Teto escolhido para caber no
  NIST: ~86 tentativas/dia (com 15 min seriam ~109). Testes: 4 unitários da
  tabela de espera + 6 e2e (botnet de IPs, dono espera e entra, sucesso
  zera, outra conta não é afetada, e-mail inexistente, maiúsculas, hash no
  Redis); checados por mutação (sem o plugin 4 falham; sem normalizar, 1).
  - Trade-off aceito: um atacante pode manter uma conta em espera de 20 min
    tentando a cada 20 min. Escalar para captcha (plugin `captcha` do
    better-auth) se isso aparecer.
- [ ] **Deploy (fase 6):** `ORIGIN` e `ADDRESS_HEADER`/`XFF_DEPTH` no
  adapter-node — sem eles toda form action dá 403 atrás de proxy TLS e o
  `getClientAddress()` vira o IP do proxy; API sem porta publicada; Scalar e
  `/v1/openapi` só na rede interna.
- [ ] **Reset de senha (G3):** não aguardar o envio do e-mail (latência do
  SMTP revela a conta), `transaction: true` no adapter drizzle,
  `Referrer-Policy: no-referrer` na página, link apontando para o dashboard.
- [ ] Acesso direto à API sem `x-real-ip` cai no balde `no-trusted-ip`: OK
  enquanto só o dashboard alcança a API; se algum outro cliente surgir, usar
  `trustedProxies`.

Não se aplica, pelo princípio do BFF: `svelteKitHandler` e `sveltekitCookies`
(exigem a instância do `auth`, com banco, no dashboard);
`deferSessionRefresh` (só com réplica de leitura); estratégias `jwe`/`jwt`.

---

### N7. Dispositivos conectados — trazido do `eco-system-sales` (2026-10-12)

**Pedido do dono:** ver como o `eco-system-sales` faz login por dispositivo e
"sair do dispositivo", e trazer para o boilerplate.

**Como é lá** (`packages/auth/src/session/*`, rotas `/v1/auth/sessions*` da
`dashboard-api`, `profile-security.tsx` + `device-session-list.tsx`):
sessões próprias (sem better-auth) — uma linha por dispositivo em
`user_session`, JWT de acesso curto + refresh token opaco rotativo (só o
SHA-256 no banco, detecção de reuso, janela de graça para refresh
concorrente), timeout absoluto 30 d e ocioso 7 d, cache em memória de 5 s
para revogação. A tela lista os dispositivos ("Chrome no Windows", IP,
"último acesso"), marca "Este dispositivo", sai de um (não o atual; outro
usuário → 404) ou de todos os outros. Os webs chamam a API pelo servidor e
repassam o user-agent do navegador (`x-client-user-agent`) e o IP **assinado
com HMAC** (`x-client-ip` + `x-client-ip-signature`, segredo
compartilhado, validade de 60 s).

**O que veio para cá** — o better-auth já tem o núcleo (`list-sessions`,
`revoke-session`, `revoke-other-sessions`, sessões no Redis), então foi só a
camada do BFF:

- [x] `callAuth` repassa o `user-agent` do navegador (sem isso toda sessão
  seria "Node"); o sign-in passou a usar `callAuth`.
- [x] `$lib/server/devices.ts`: `describeUserAgent` (portado de vendas),
  `toDevices` (atual primeiro, depois as mais novas; **sem o token**, que é a
  credencial), `tokenFor` (id → token só da lista do próprio usuário; recusa a
  sessão atual), `timeAgo` (`Intl.RelativeTimeFormat`, en/pt/es).
- [x] Perfil → **Dispositivos conectados**: lista, "Sair" por dispositivo,
  "Sair de todos os outros dispositivos"; funciona sem JS.
- [x] Testes: e2e na API (rótulo com navegador e IP, sair de um, sair dos
  outros mantendo o atual, não revoga sessão de outro usuário) + 15 unitários
  no dashboard. Runtime contra containers efêmeros com dois navegadores
  simulados (Chrome/Windows e Safari/iPhone) e tela conferida no Chromium.

**Diferenças conscientes:**

- "Último acesso" vira "entrou há…": com `disableSessionRefresh` (teto de
  24 h) a sessão não é tocada depois do login. Vendas atualiza no refresh.
- Revogação vale em até 60 s (cookie cache), contra 5 s em vendas.
- Sem dimensão "app" (painel/loja): aqui há um app só.
- Refresh token rotativo com detecção de reuso não se aplica: o better-auth
  usa sessão opaca no servidor, sem refresh token no navegador.

- [x] **`x-real-ip` assinado com HMAC** (pedido do dono, 2026-10-12),
  portado de vendas: `@pack/auth/client-ip` (`signClientIp`,
  `verifyClientIp`, `stripUnverifiedClientIp`; HMAC-SHA256 sobre
  `timestamp.ip`, validade 60 s, `timingSafeEqual`). O dashboard assina em
  todo `authFetch`; a rota `/auth` da API só mantém o IP com assinatura
  válida e descarta o resto (log `auth.client_ip.rejected`), caindo no balde
  compartilhado. `CLIENT_IP_SECRET` (≥ 32) nos `.env.example` da API e do
  dashboard (vazio, falha na subida) e nos `.env` locais (mesmo valor,
  gerado). Testes: 9 unitários + 5 e2e (IP sem assinatura, outro segredo,
  replay de 2 min, assinatura válida, sessão grava só o IP assinado);
  mutação: sem a verificação, 4 dos 5 e2e falham. Runtime: segredos iguais
  → chave `127.0.0.1`; segredo errado → `no-trusted-ip` + aviso; segredo
  curto → dashboard não sobe.
  - Achados no caminho, resolvidos na causa (pedido do dono):
    1. **Bug do Bun** — `new Request(req, { headers })` ignora `headers`
       vazio e mantém os originais (só no Bun; Node segue a spec; ainda no
       canary 1.4.4; documentado no PR oven-sh/bun#41994). Um IP forjado
       sozinho passaria. Solução: não copiar o `Request` —
       `stripUnverifiedClientIp` remove os headers na própria requisição. E
       um plugin do Biome (`biome-plugins/no-request-copy-with-headers.grit`)
       barra o padrão no lint, sem acusar entradas que são URL.
    2. **Build quebrado sem o `verify` perceber** — causa: o alias `@pack/*`
       do `svelte.config.js` (herança da migração do Next) desviava o Vite
       dos `exports` dos pacotes e obrigava shims na raiz
       (`packages/auth/cookies.ts`, `packages/observability/logger/index.ts`).
       Solução: alias removido (os pacotes já estão linkados em
       `node_modules`), shims apagados; render frio do `vite dev` igual
       (10,8–14,5 s sem vs 11,6–12,9 s com, 3 rodadas cada). E o `verify` e o
       CI passam a rodar `turbo check:svelte build` (o build depende de
       `test`): +11 s, e um import que só o Vite não resolve agora quebra o
       gate.
- [x] **e2e de dispositivos completados** (10 no total): exigem login,
  cada usuário vê só os seus, `sign-out` tira da lista, dispositivo
  desconectado não gerencia mais nada, sessão revogada some do Redis, sessão
  aberta pelo 2FA também leva navegador e IP.

---

## 🔴 Bugs e segurança (achados da varredura)

1. ✅ **(fase 1, 2026-10-12)** **Logout forçado a cada ~5 min.** `(authenticated)/+layout.server.ts:6`
   redireciona se `locals.session` é nulo, mas ele só vem do cookie cache
   (`maxAge: 60*5`, `packages/auth/src/server.ts:16`). O fallback de
   `hooks.server.ts:127` (`getSessionCookie`) é anulado pelo layout, e nada
   renova o cache: `createApiClient` e o fetch do layout descartam o
   `Set-Cookie` da API.
   **Feito:** `sessionHandle` usa `resolveSession`
   (`src/lib/server/session.ts`): no cache miss com token, revalida via
   `/auth/get-session` e repassa o `session_data` novo ao browser; token
   rejeitado → cookies limpos; API fora → 503 nas rotas protegidas. O layout
   lê `locals.user` (saiu um fetch por navegação). Conferido em `node build` e
   `vite dev`.
2. ✅ **(fase 1, 2026-10-12)** **Proxy `/auth/*` do dashboard → 500 sob Node.** `hooks.server.ts:49` faz
   `response.headers.set` num `Response` de `fetch` (headers imutáveis no
   undici). Reproduzido com `node build`. Bun não quebra, mas o adapter-node
   fica (N3) → corrigir criando um `new Response(body, { headers })` mutável.
   **Feito:** `proxyRequest` (`src/lib/server/proxy.ts`) devolve um
   `Response` novo, descarta headers hop-by-hop e `content-encoding`, e não
   segue redirect (`redirect: 'manual'`). Antes 500, agora 200 em `node build`.
3. ✅ **(N6, 2026-10-12)** **Rate limit do login ineficaz.** Sem `rateLimit` no better-auth: default
   só em `production`, storage em memória por processo, IP do primeiro
   `x-forwarded-for` (forjável); sem header → IP `null` → limite pulado. O
   dashboard (`auth-proxy.ts:34`) não repassa o IP do cliente. Corrigir com
   `rateLimit` + storage Redis (`@pack/cache`) + `advanced.ipAddress`.
4. **Dockerfile da API provavelmente não builda** (leitura, não buildado):
   `--frozen-lockfile` sem montar `bun.lock`; não monta
   `apps/dashboard/package.json`; `linker = "isolated"` mas só copia
   `/app/node_modules`. Imagem em **bun 1.3.14** (`dofigen.lock`) vs 1.4.2 no
   `mise.toml`.
5. ✅ **(fase 3, 2026-10-12)** **`db:reset` sem guarda real.** `reset-db.ts:5` só checa
   `NODE_ENV === 'local'`, que o próprio `packages/db/.env` define e o Bun
   auto-carrega. `DATABASE_URL` de prod no shell passa. Checar host/nome do
   banco. (Typo "eeset" na linha 10.)
   **Feito:** `resetRefusal` (`src/reset-guard.ts`): só host local
   (localhost/127.0.0.1/::1) e nunca `NODE_ENV=production`; 6 testes; recusa
   conferida em runtime (host remoto e produção → exit 1). Typo corrigido.
6. **Seed inseguro** (`admin.seed.ts`). ✅ parcial (2026-10-12): o admin
   semeado **não conseguia entrar** — gravava `account.accountId = email`, e o
   better-auth 1.7 só aceita a credencial com `accountId === user.id` ("User
   not found" → 401). Corrigido (`accountId: newUser.id`), com e2e
   `seed-admin.e2e.test.ts` que roda o seed e faz login (mutação: com o e-mail
   no `accountId`, falha). ✅ **Resto feito (fase 3):** sem credencial padrão
   (e-mail e senha de 8–128 exigidos só ao criar, então um admin já existente
   segue intacto), user + account numa transação, senha fora do log, erro →
   exit 1; `.env.example` sem senha; e2e (cria e entra, re-run não mexe, senha
   curta/ausente recusada sem gravar nada). Texto original: fallback `admin@example.com`/`admin`
   (abaixo do `minPasswordLength: 8`), loga a senha em claro (`:34`), inserts
   sem transação (user sem credential em re-run), `seed/index.ts:13`
   `.catch(console.error)` sai com 0.
7. ✅ **(fase 3, 2026-10-12)** **XSS latente em `@pack/seo`** — `json-ld.ts:14` é `JSON.stringify` puro
   dentro de `{@html <script>}`; `</script>` num valor escapa. Escapar `<`,
   `>`, `&`, U+2028/2029.
   **Feito:** escape como `\u003c` etc. (o JSON continua idêntico para o
   parser); 4 testes, 3 falham no código antigo.

## 🟡 Médio

- ✅ (fase 4) `route` no log era sempre `/*` e o access log não tinha path;
  `ip` confiava em `cf-connecting-ip`/`x-forwarded-for`. Agora `route` é o
  padrão do handler (`hono/route`), `path` a URL, `ip` o peer TCP (e o IP
  assinado no `/auth`). Testes unitários + conferido no log real.
- ✅ (fase 4) Shutdown: `server.stop()` não aguardado antes de fechar o pool;
  crash terminava com `exit(0)`. Agora `drain` (testado na ordem), crash →
  exit 1. Achado na prova: com o coletor OTLP fora, o flush travava o
  shutdown até o kill de 10 s (exit 1) — agora tem teto de 2 s; SIGTERM
  conferido: ~5 s, exit 0.
- ✅ (fase 3) Env sem validação: `BETTER_AUTH_SECRET` `min(1)` (aceita o placeholder
  `32-length`); `BETTER_AUTH_URL` com default localhost (desliga secure
  cookies em prod); `NODE_ENV ?? ''` em `apps/api/src/core/env.ts:25`;
  `ORIGIN_ALLOWED` aceita `''`; `API_URL` do dashboard com default; SMTP
  opcional → `port: NaN` só no primeiro envio. **Feito:** segredos com 32+,
  sem default de URL, `ORIGIN_ALLOWED` com URLs reais, `NODE_ENV` enum na API,
  `SMTP_HOST` exige porta válida, `''` = não definido; testes em auth e email.
- ✅ (fase 1) Limpeza de cookie no 401 usava `startsWith('better-auth.')` e
  ignorava `__Secure-better-auth.*` (HTTPS), copiada em 3 `+page.server.ts`.
  Agora é `clearAuthCookies` em `src/lib/server/auth-cookies.ts`.
- ✅ (N6) Nome do cookie cache no dashboard: `getCookieCache` procura
  `__Secure-better-auth.session_data` quando `NODE_ENV=production`, mas a API
  só põe o prefixo se o `BETTER_AUTH_URL` dela for https. Se divergirem, todo
  request erra o cache e paga o hop do `get-session`: não quebra mais desde a
  fase 1, mas fica lento. Plano em **N6** (config de cookie única
  em `@pack/auth`, fase 3).
- ✅ (fase 3) Scrub do Sentry era denylist: `request.data`, `query_string`,
  `x-forwarded-for`, `set-cookie` e breadcrumbs passavam. Agora allowlist
  (método, URL sem query, 4 headers; breadcrumbs sem `message`/`data`).
- ✅ (fase 3) Logger sem `redact`: agora censura `password`, `token`,
  `secret` e headers de credencial. O bridge OTel mandando `ip`/`user_agent`
  ao Loki fica **por design**: é o mesmo contrato do log (§6 do CLAUDE.md), e
  o Loki é nosso — só o Sentry (terceiro) é allowlist.
- ✅ (fase 3) Dashboard sem CSP nem `frame-ancestors`: agora `kit.csp` com
  nonce, `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`; Chromium sem violações (build e
  dev); o tema do mode-watcher recebe o nonce via placeholder.
- `apps/api/.env.example` com credenciais "genergia" que não batem com o
  compose — fork novo não conecta. (✅ parcial: `REDIS_URL` corrigido no N6;
  falta o `DATABASE_URL`, que ainda aponta `genergia_*@db-pg`.)
- ✅ (fase 4) `safeFetch` engolia erros sem log: agora loga cada falha com a
  causa (o layout já não faz fetch desde a fase 1).

## 🟢 Baixo

- ✅ (fase 4) `HOST` agora vai ao `Bun.serve`; `/v1/*` inexistente → 404
  JSON (era 401); `HTTPException` 5xx não vaza mais `err.message`.
- ✅ (fase 4) Redirect de locale descartava a query string. (✅
  `startsWith('/auth')` casando `/authors`: o proxy `/auth` saiu no N6.)
- ✅ (fase 4) `<html lang="en">` fixo — agora segue o locale. Páginas sem
  `<title>` e breadcrumb com `href="#"` ficam para a fase 9 (telas).
- ✅ (fase 4) Scalar/OpenAPI com server URL fixo em localhost: agora
  relativo. "Público em prod" deixou de valer: a API só existe na rede
  interna (N6); a receita de deploy (fase 6) não publica a porta.

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
- ✅ (fase 5) `.claude/settings.local.json` só era ignorado pelo gitignore
  global — agora está no `.gitignore` do repo.
- **Deps:** 32 desatualizadas. Majors: SvelteKit **3.0**, adapter-node **6.0**
  (novos desde 09-30), TypeScript 7, `@sentry/bun` 11, nodemailer 10.
- **Código morto:** `@pack/storage` sem importador; `concurrently` e `ws` sem
  uso; `/health` em `QUIET_PATHS` sem rota. (✅ resolvidos pelo N6:
  `@pack/cache` agora guarda sessões e rate limit; `@pack/auth/client.svelte`
  foi apagado.)

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
- **G2 — Testes do dashboard** (era P0 #3). **Feito em grande parte (fase 1):**
  40 testes em `apps/dashboard/test/unit` (`bun test` puro, sem Vite) para
  `auth-proxy`, `safe-fetch`, sessão, proxy e cookies; `test/**` entrou no
  `svelte-check`. Falta `packages/i18n/src/format.ts`. Texto original: Lógica pura, sem infra:
  `src/lib/auth-proxy.ts` (`localizeAuthError`, `redactEmail`,
  `userMessageFor`), `src/lib/api/safe-fetch.ts` (erro + zod),
  `packages/i18n/src/format.ts`. Somar: o fix do logout de 5 min (🔴 1) e a
  limpeza de cookie `__Secure-*`.
- **G3 — Fluxos de auth** (era §6). Sign-up com auto-sign-in (hoje redireciona
  para `/sign-in` e descarta o `Set-Cookie`); forgot/reset password (o
  `revokeSessionsOnPasswordReset` já está configurado, falta UI e envio via
  `@pack/email`). **Decidido (2026-10-12):** verificação de e-mail e
  `disableSignUp` ficam **fora** — quem forka decide pelo projeto. O 2FA já
  foi feito (N6). O sign-up com auto-sign-in também sai: `autoSignIn: false`
  é deliberado (N6, anti-enumeração). Fica só o reset de senha.
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
- ✅ **G8 — Hardening** (fase 3, 2026-10-12). `secureHeaders` e `bodyLimit`
  de 1 MiB (413 `PAYLOAD_TOO_LARGE`, código novo) na API, com e2e; CSP no
  dashboard (ver 🟡). `hono/csrf` **não**: a API não fala com navegador e o
  better-auth checa o Origin das próprias rotas. better-auth em prod: feito
  no N6 (secure cookies via `BETTER_AUTH_URL` https, cache de 60 s).
- **G9 — `/metrics`** (era §14). **Fora deste card (2026-10-12):** nada de
  Prometheus/OTLP aqui; o dono vai tratar métricas numa frente própria.
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
`turbo build`, que roda os testes; `--force` no turbo para sinal real) no baseline ou melhor, e com a verificação de runtime
que o item pede. Um commit por fatia; docs (`CLAUDE.md`, `README`) atualizados
no mesmo commit da mudança de comportamento.

| # | Fase | Itens |
| --- | --- | --- |
| 0 ✅ | Rede de segurança | zerar lint, **G1** CI, **G5** scripts da raiz, corrigir o drift de `CLAUDE.md`/`README` — feito 2026-10-12 (CI ainda não rodou no GitHub) |
| 1 ✅ | Bugs visíveis | 🔴 1 (logout 5 min), 🔴 2 (proxy `/auth` 500) + testes em **G2** — feito 2026-10-12 |
| 2 ✅ | Rename | **N1** `@app/dashboard-api` — feito 2026-10-12 |
| 3 ✅ | Segurança | **N7** ✅ dispositivos conectados; **N6** ✅ (API escondida, rate limit por IP e por conta, sessões no Redis, cookies, MFA opcional) — sobram itens de deploy (fase 6) e reset de senha (G3); 🔴 3 ✅, 🔴 5/6 ✅ reset e seed, 🔴 7 ✅ json-ld, ✅ validação de env, ✅ scrub do Sentry, ✅ `redact`, ✅ **G8** hardening — fase fechada 2026-10-12 |
| 4 ✅ | Correção da API | `route` no log, shutdown, `HOST`, 404 vs 401, `HTTPException` 5xx, Scalar em prod; + `safeFetch` com log, query no redirect de locale, `<html lang>` — fechada 2026-10-12 |
| 5 ✅ | Bun-first | **N3** (tipos/config/docs, `NodeTracerProvider`, `Bun.spawnSync`) — fechada 2026-10-12 |
| 6 | Deploy | 🔴 4 Dockerfile da API em bun 1.4.2 buildado, **G7**, **G6**, pins das imagens |
| 7 | Banco | **N2** `/v1/me` + **O1** spans de DB + doc de como forkar o schema |
| 8 | Design system | **G4** |
| 9 | Telas | **N4** + **G3** (só reset de senha), uma tela por fatia: Profile (com o antigo Settings) → Customers → Employees → Dashboard; **e2e de navegador (Playwright)** |
| 10 | Observabilidade do dashboard | **O2** |
| 11 | Dependências | patches, depois **H1** um major por fatia |
| 12 | Higiene | pins fora do catálogo, ignores do biome, hash de env no turbo, código morto |
| 13 | Release | **G10** — último commit |
| — | **Opcionais (o dono decide depois)** | **O3** manifests k8s/HPA; captcha no login (escalada do limite por conta); "confiar neste dispositivo" no 2FA; budget de bundle (`ANALYZE=1`); redirect de `/settings` → `/profile` |

Fases 0–1 primeiro: sem CI, o resto é mudança sem rede. A fase 11 fica depois
das telas para não brigar com SvelteKit 3 no meio do N4.
