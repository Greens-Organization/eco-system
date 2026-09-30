# Boilerplate Gaps — Audit & Roadmap

> Auditoria original: 2026-05-10. **Re-auditado: 2026-09-30** contra a árvore
> atual de `apps/` e `packages/`.
> Método: cada afirmação foi verificada por execução ou inspeção do código —
> não por memória do documento anterior.
> Status: metade do P0 original fechou sozinha nos commits de junho. O que
> sobrou está abaixo, mais 9 lacunas que a auditoria original não via.

---

## TL;DR (2026-09-30)

A fundação continua madura. O que mudou desde maio: README existe, os 7
pacotes "vazios" viraram zero, as 4 rotas mortas da sidebar existem, e
observabilidade saiu de "só pino" para OTel + Sentry + contrato documentado.

O que **dói hoje**, em ordem:

1. **Zero CI e zero gate local** — 70 testes existem e nada os roda
2. **Zero rate limiting no repo** — `/auth/sign-in/email` sem throttle
3. **Design system parado em 13 componentes** — sem dialog, table, card, form
4. **Toda a v1 é mock** — o dashboard parece vivo e não toca o banco
5. **Dashboard sem nenhum teste**

> Este documento é ferramenta de construção. Ele — e o resto de `tasks/` — sai
> do repo no commit de release do template (§17), para quem forkar começar
> limpo.

---

## ✅ Fechado desde a auditoria original

Verificado item a item; não precisa mais de atenção.

| Item original | Estado hoje |
| --- | --- |
| §2 README de uma linha | Reescrito (`cd91e2b`, atualizado 2026-09-30) |
| §3 sete pacotes vazios/esqueleto | **Zero.** `rate-limit` e `payments` removidos; `cache` implementado com `Bun.RedisClient` (`6afee55`); `storage` com `Bun.s3` (`0a37781`); `testing` com `index.ts` + `preload.ts`; `seo` reduzido a `json-ld` por decisão (`858b7ad`) |
| §4 sidebar apontando para 404 | `customers`, `employees`, `settings`, `profile` existem (`ac83234`, `98aac6d`, `02a51ae`, `86d6968`) |
| §9 observabilidade além do pino | OTel traces + metrics, Sentry por classificação, contrato no `CLAUDE.md` §6 |
| §14 camada de cache | `@pack/cache` implementado |
| §1 (parcial) testes | Vitest descartado; **70 testes** em 6 pacotes + suíte e2e de 7 arquivos |

Fechado em **2026-09-30** (ver `tasks/done/pendencias-2026-09-30.md`):

| Lacuna | O que foi feito |
| --- | --- |
| `turbo.json` com resto de Next | `.next/**` e `.react-email/**` removidos; binário da API adicionado a `outputs` e ao `.gitignore` |
| `docker:infra:*` do `apps/api` | removidos — apontavam para compose inexistente |
| Colisão de porta | Grafana passou a publicar em `3001` |
| `@pack/email` React | react-email/react/resend removidos; só SMTP sobre nodemailer, com `exports` map; dep phantom da API declarada |
| Toolchain divergente | `mise.toml` com bun 1.4.2 + node 26.10.0; `packageManager` e `engines` alinhados |
| 60 deps desatualizadas | 27 subiram; **18 seguem abertas por decisão** (4 majors, 7 minors de 0.x, grupo OTel em lockstep) |
| `LANGUINE_PROJECT_ID` | documentado no `.env.example` do i18n + seção no README |
| Cobertura (parcial) | `@pack/db` (10) e `@pack/auth` (5) ganharam testes — 6 de 12 pacotes |

---

## 🔴 P0 — o que realmente falta

### 1. CI — nada roda sozinho

`.github/` tem `CONTRIBUTING.md`, `SECURITY.md`, templates de issue e PR.
**Nenhum `workflows/`.** Desde 2026-09-30 também não há gate local (`memory/`,
`.agent-md/`, `agent-md.toml` e os hooks do `.claude/` foram removidos).

Resultado: 70 testes verdes que ninguém executa, e um lint com 5 erros
conhecidos que nada bloqueia.

Mínimo viável — um workflow rodando o que já está medido e verde:

```
bunx turbo run typecheck   # 13/13
bunx biome check .         # 5 erros conhecidos — zerar antes de tornar bloqueante
bunx turbo run test        # 70 pass, 6 tasks
```

Nas versões do `mise.toml` (bun 1.4.2, node 26.10.0). Estimativa: 1–2h.

### 2. Rate limiting — não existe mais em lugar nenhum

`@pack/rate-limit` foi removido e **nada ocupou o lugar**. Hoje:

- `/auth/sign-in/email` aceita tentativas ilimitadas → brute-force de credenciais
- `/v1/*` tem `authMiddleware` (sessão), mas nenhum limite por IP ou por conta

A auditoria original tratava isso como "expandir o rate-limit para `/v1`".
A premissa mudou: não há de onde expandir. Opções: middleware Hono próprio com
`@pack/cache` (o Redis já está de pé), ou um plugin do better-auth para a
superfície de auth.

Estimativa: 2–3h. **É o item mais sensível a segurança da lista.**

### 3. Dashboard sem testes

Zero arquivos de teste em `apps/dashboard`. Os 70 testes cobrem `api`,
`@pack/observability`, `@pack/tools`, `@pack/testing`, `@pack/db` e
`@pack/auth` — 6 de 12 pacotes.

Alvos óbvios, todos lógica pura e já existentes:
`src/lib/auth-proxy.ts` (`localizeAuthError`, `redactEmail`, `userMessageFor`),
`src/lib/api/safe-fetch.ts` (caminho de erro + validação zod),
`packages/i18n/src/format.ts` (formatadores Intl).

> A auditoria original sugeria testar
> `apps/api/src/main/middleware/request-logger.ts` — esse arquivo não existe
> mais, virou `observability.ts`.

---

## 🟡 P1 — superfície de produto

### 4. Design system: 13 componentes, os mesmos de maio

`avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `dropdown-menu`,
`input`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `tooltip`.

Continua faltando o básico de dashboard: `dialog`/`alert-dialog`, `toast`,
`table`, `card`, `alert`, `tabs`, `switch`/`checkbox`/`radio-group`, `popover`,
`command`, `pagination`, `progress`, `form`/`label`.

Sintoma concreto: as páginas de `customers` e `employees` renderizam listas à
mão porque não há `table`.

### 5. Detalhes de UX pendentes

- `svelte-sonner` está no catálogo e **nunca é importado** — não há toast
- `skeleton` existe como componente e não é usado em nenhum estado de carregamento
- Validação de formulário é só server roundtrip; sem `sveltekit-superforms`

> Correção da auditoria original: ela pedia um `+loading.svelte`, dizendo que
> "SvelteKit 2 suporta". **Não existe** esse arquivo de rota no SvelteKit. O
> equivalente real é `{#await}`, o `navigating` de `$app/state`, ou streaming de
> promessas pelo `load`.

### 6. Fluxos de auth incompletos

Verificado em `packages/auth/src/server.ts`: só `emailAndPassword`, nenhum
plugin habilitado.

- Sign-up **não** faz auto-sign-in — redireciona para `/sign-in` (`+page.server.ts:90`)
- Sem UI de forgot-password (better-auth suporta)
- Sem verificação de e-mail
- Sem 2FA, sem gestão de multi-sessão

### 7. Toda a v1 é mock

`stats`, `customers` e `employees` retornam dados hardcoded. Quem forka recebe
um dashboard que parece vivo e não toca o Postgres — apesar de `@pack/db` ter
schema, migrations e seed funcionando. Falta pelo menos **uma** rota real de
ponta a ponta como referência do padrão.

---

## 🟡 P1 — DX

### 8. Sem comandos agregados na raiz

Nenhum de `check`, `db:push`, `db:seed`, `db:reset`, `setup` existe. Hoje o
forker precisa descobrir `cd packages/db && bun run db:migrate` sozinho, e não
há comando único de pré-commit. `typecheck` também não tem alias na raiz — só
`bunx turbo run typecheck`.

### 9. Gestão de env

4 arquivos `.env.example` (`apps/api`, `apps/dashboard`, `packages/db`,
`packages/i18n`). `BETTER_AUTH_SECRET` precisa bater entre API e dashboard ou a
sessão quebra silenciosamente — documentado só num comentário do
`apps/dashboard/.env.example`. O `packages/i18n/.env.example` expõe
`LANGUINE_PROJECT_ID`, um acoplamento a serviço de tradução que não está
documentado em lugar nenhum.

### 10. Receita de deploy incompleta

Só `apps/api` tem `Dockerfile` (via dofigen, com digest pinado). Falta imagem do
dashboard (`adapter-node`) e um compose prod-like (postgres + api + dashboard).

---

## 🟢 P2 — hardening

### 11. Middleware de segurança do Hono não montado

`apps/api/src/main/app.ts` usa `cors`, `requestId`, instrumentação OTel,
`observability` e `prettyJSON`. **Não usa** `hono/secure-headers`, `hono/csrf`
nem `hono/body-limit`.

### 12. CSP do SvelteKit

`kit.csp` não está configurado em `apps/dashboard/svelte.config.js`.

### 13. better-auth em produção

`useSecureCookies` não é setado (depende do `https://` em `BETTER_AUTH_URL`);
`cookieCache.maxAge` é 5min — ok para dev, avaliar para revogação rápida.

### 14. Sem `/metrics`

Não há endpoint de scrape Prometheus. As métricas saem por push OTLP
(`MeterProvider`). Só é lacuna se o alvo de deploy usa scrape em vez de
collector — decidir, não assumir.

### 15. Budget de bundle sem CI

O plugin `bundleStats` existe no `vite.config.ts` (gated por `ANALYZE=1`), mas
sem CI não há como falhar em regressão.

### 16. Adaptador único

`@sveltejs/adapter-node` apenas. Documentar a receita de troca (Cloudflare /
Vercel / Netlify) seria suficiente para um template.

---

## 🆕 Lacunas que a auditoria original não via

As 7 restantes foram fechadas em 2026-09-30 (tabela acima). Seguem abertas:

1. **Sem gate de verificação** — removido em 2026-09-30, CI ainda não existe (§1).
2. **Zero rate limiting** — o pacote foi removido sem substituto (§2).
3. **Cobertura ainda parcial** — 6 de 12 pacotes; o dashboard continua com zero
   testes (§3).

---

## 📦 §17 — Release do template (último passo, depois de tudo)

Este repo é a oficina; quem forka deve receber a casa limpa. No commit que
publica o template:

1. **Apagar `tasks/`** por inteiro — `todo/`, `done/`, `in-progress/`. É estado
   de construção, não conteúdo do boilerplate.
2. **Tirar a identidade hardcoded.** Hoje `eco-system` / `GRN Group` estão em
   código, não só em docs:
   - `apps/dashboard/src/routes/[locale]/(unauthenticated)/+layout.svelte`
     (nome + a citação do rodapé)
   - `.../(unauthenticated)/sign-in/+page.svelte` e `.../sign-up/+page.svelte`
   - `apps/dashboard/src/routes/+error.svelte`
   - `apps/dashboard/src/lib/components/sidebar/app-sidebar.svelte`
   - `packages/observability/pack-env.ts` — vira o campo `service` de **todo**
     log estruturado
   Trocar por um placeholder óbvio (`APP_NAME`) ou por env, e documentar no
   README como renomear.
3. **Decidir `screenshots/`** — hoje só o `.gitkeep` é commitado; se não faz
   parte do template, remover.
4. **Revisar `README.md` e `CLAUDE.md`** com olhos de quem acabou de clonar.
5. Conferir que nenhum `.env` real entrou (hoje só os `.example` são
   rastreados — manter assim).

---

## Correções à auditoria original

Coisas que o documento de maio afirmava e que não se sustentam mais:

- "`vitest@4.1.5` nos devDeps mas nenhum arquivo de teste" — vitest saiu, 55
  testes existem.
- "README é uma linha" — falso desde `cd91e2b`.
- "Sete pacotes vazios" — zero.
- "`+loading.svelte`" — esse arquivo de rota não existe no SvelteKit.
- "`tasks/completed/auth.md`" — o diretório virou `tasks/done/`.
- "`request-logger.ts`" como alvo de teste — arquivo renomeado para
  `observability.ts`.

---

## Roadmap sugerido

| # | Item | Esforço | Por quê |
| --- | --- | --- | --- |
| 1 | Zerar os 5 erros de lint + workflow de CI | 2–3h | única rede de proteção que sobrou |
| 2 | Rate limiting em `/auth/*` e `/v1/*` | 2–3h | brute-force de credenciais hoje é livre |
| 3 | Uma rota v1 real, de ponta a ponta | 2–4h | prova o padrão; tira o dashboard do mock |
| 4 | `table`, `dialog`, `card`, `form`, `toast` | 4h | table-stakes de dashboard |
| 5 | Testes do dashboard (auth-proxy, safe-fetch, format) | 2h | lógica pura, sem infra |
| 6 | Scripts agregados na raiz + doc de env | 1h | onboarding |
| 7 | `secure-headers` + `csrf` + `body-limit` + CSP | 1–2h | hardening barato |
| 8 | Dockerfile do dashboard + compose prod-like | 2–3h | receita de deploy |
| ~~9~~ | ~~Limpar `turbo.json`, script quebrado, colisão de porta~~ | — | ✅ feito em 2026-09-30 |
| 10 | **Release do template** (§17): apagar `tasks/`, de-brandar, revisar docs | 1h | último commit; deixa o fork limpo |

Itens 1–3 são o que separa "promissor" de "dá pra forkar e subir". O item 10 é
sempre o último: enquanto houver linha aberta acima, este documento ainda tem
função.
