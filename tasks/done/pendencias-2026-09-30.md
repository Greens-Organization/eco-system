# Pendências do audit — plano de execução

> Data: 2026-09-30. Base: 3 análises de sub-agent (deps, `@pack/email`, cobertura
> de testes) + inspeção direta. Cada fatia verifica antes de seguir para a próxima.
>
> **Concluído em 2026-09-30.** Estado final verificado: typecheck 13/13, lint nos
> 5 erros pré-existentes (4 filename em `db/schema/User/*` + favicon), testes
> **6 tasks / 70 testes**, build de produção do dashboard OK, bun 1.4.2 +
> node 26.10.0 ativos. Desvios do plano registrados ao pé de cada fatia.

## Já feito (fatia 0)

- `turbo.json`: removidos `.next/**`, `!.next/cache/**`, `.react-email/**`.
  Adicionado `api` (o binário compilado não era cacheado) e ignorado no git.
- `.gitignore`: removida a entrada morta `packages/database/generated`.
- `apps/api`: removidos `docker:infra:up|down` (apontavam para compose inexistente).
- Grafana movido para `3001:3000`; tabelas de porta do `CLAUDE.md` e `README.md`
  atualizadas.
- `LANGUINE_PROJECT_ID` documentado no `.env.example` do i18n + seção no README.

---

## Fatia 1 — toolchain

Hoje: `.tool-versions` diz bun 1.3.13, `packageManager` diz 1.3.14, mise global
tem 1.4.2. Upstream: bun **1.4.2**, node **26.10.0**.

1. `mise.toml` novo (`bun = "1.4.2"`, `node = "26.10.0"`); apagar `.tool-versions`.
2. `package.json`: `packageManager: "bun@1.4.2"`, `engines.node: ">=26"`.
3. `@types/bun` `1.3.14 → 1.4.2` em **6 locais**: raiz, `apps/api`,
   `packages/{cache,observability,storage,testing}`.
4. `bun install`.

**Verificar:** `turbo run typecheck --force`, `biome check .`, `turbo run test --force`.

> Ordem importa: `@types/bun` 1.4.2 estaria à frente do runtime se o Bun não
> subisse antes.

**Executado.** `mise trust` + `mise install` foram necessários (node 26.10.0 não
estava instalado). Uma quebra real apareceu: `@types/bun` 1.4.2 adicionou
`textStream` ao `Response`, e o `ClientResponse` do Hono não o tem — o
`svelte-check` do dashboard passou a falhar em `safe-fetch.ts:34`. Corrigido
tipando `failure()` estruturalmente (`{ status, json() }`), que é o que a função
de fato lê; some o acoplamento acidental a qual `Response` está em escopo.

---

## Fatia 2 — `@pack/email` sem React

Achado do sub-agent: **toda a superfície React é código morto.** Ninguém importa
`sendEmail`, `sendEmailHtml`, `sendBatchEmailHtml` nem `ContactTemplate`. O único
import vivo em todo o repo é `@pack/email/pack-env` em
`apps/api/src/core/env.ts:2` — e é dependência phantom (não declarada no
`apps/api/package.json`).

Decisão do dono: **tirar o React, manter o SMTP.**

1. Apagar `src/templates/contact.tsx`; remover `sendEmail(react)` de `src/send.ts`
   (ficam `sendEmailHtml` + `sendBatchEmailHtml`, que já recebem HTML string).
2. Remover deps: `@react-email/components`, `@react-email/render`, `resend`
   (declarada e nunca importada), `react`, `react-dom`.
3. Remover do catálogo da raiz: `react`, `react-dom`; do `catalogs.dev`:
   `@types/react`, `@types/react-dom` — as 4 são exclusivas deste pacote.
4. `tsconfig.json` do pacote: tirar `jsx: react-jsx` e o `lib` com DOM.
5. Adicionar `exports` map — é o único pacote funcional sem um, contrariando o
   `CLAUDE.md`.
6. Declarar `@pack/email` em `apps/api/package.json` (mata a phantom dep).
7. README: "nodemailer / Resend" → só nodemailer.

**Verificar:** typecheck 13/13, lint, testes, e `grep -r react` sem resultado fora
de `node_modules`.

**Executado.** `bun install` não poda symlinks órfãos — `packages/email/node_modules`
manteve `react`, `react-dom`, `@react-email`, `resend` apontando para o store até
eu apagar o diretório e reinstalar. Aproveitei para matar o symlink pendurado
`apps/api/node_modules/@pack/payments` (pacote removido em junho). Restam no
`bun.lock` apenas menções a `react` em **peers opcionais** declarados pelo
`better-auth` — metadado upstream, nada instalado. `@pack/email` agora exporta
só `sendEmailHtml` e `sendBatchEmailHtml`.

---

## Fatia 3 — passe seguro de dependências

Do sub-agent: 51 pacotes únicos desatualizados. **Fora do passe:**

- 4 majors: `typescript` 6→7, `@types/node` 25→26, `nodemailer` 9→10,
  `@sentry/bun` 10→11.
- 7 minors de 0.x (breaking por convenção): `@formatjs/intl-localematcher`,
  `@scalar/hono-api-reference` e os 5 exporters OTel `0.219→0.222`.
- **Grupo OTel inteiro**: os três `2.8.0→2.11.0` são seguros isoladamente, mas a
  OTel publica em lockstep — subir só a metade 2.x arrisca descasar a API interna
  do SDK. Vai junto ou não vai.

**Entra** (~35 pacotes): catálogo (14 chaves, já sem react/react-dom), devDeps da
raiz (`@biomejs/biome` 2.5.14, `turbo` 2.11.5) e pins literais por pacote.

Armadilhas de pin duplicado — editar **os dois lados** ou as versões divergem:

- `@lucide/svelte`: catálogo **e** literal em `design-system` (1.18.0 → **1.49.0**)
- `svelte-check`: literal em `apps/dashboard` **e** `design-system`
- trio Tailwind: `tailwindcss` + `@tailwindcss/postcss` (catálogo) e
  `@tailwindcss/vite` (literal no dashboard)

`@lucide/svelte` sai em commit próprio: são 31 minors e os deep imports estão no
caminho crítico do cold-start do vite.

**Verificar:** typecheck, lint, testes, `svelte-check` do dashboard e `vite build`.

**Executado.** 15 versões na raiz (catálogo + devDeps) e 12 pins literais em 7
pacotes, tudo verde. `@lucide/svelte` 1.18.0 → 1.49.0 foi aplicado depois, em
separado, com os dois pins movidos juntos; verificado por typecheck, `vite build`
de produção e resolução dos 10 ícones deep-import a partir do dashboard.
**Sobraram 18 pacotes desatualizados** — os 4 majors, os 7 minors de 0.x e o
grupo OTel, todos fora do passe por decisão.

---

## Fatia 4 — testes de `@pack/db` e `@pack/auth`

Hoje 4 de 12 pacotes têm script `test`. Padrão a copiar (do sub-agent):
`packages/<pkg>/tests/*.test.ts`, `import { describe, expect, test } from 'bun:test'`,
import relativo `../src/...`, sem mocks — os testes existentes usam função pura,
sink injetado ou subprocesso.

Alvos puros, sem infra:

**`@pack/db`**
- `pack-env.ts` `schema`: `DATABASE_URL` rejeitando não-URL; `DRIZZLE_SQL_LOGS`
  aceitando `yes/true/no/false` e rejeitando `'1'`; default `false`; os 3
  `ADMIN_*` opcionais; `min(1)` rejeitando `''`.
- `schema/utils/`: `createdAt`, `updatedAt`, `uuidv7`, `gTimestamp` — invocar os
  `$defaultFn`/`$onUpdate` e conferir `Date` / UUIDv7; conferir nome custom.
  Não importam `pack-env`, então rodam sem env nenhuma.

**`@pack/auth`**
- `pack-env.ts` `schema`: o transform de `ORIGIN_ALLOWED`
  (`'a, b ,c'` → `['a','b','c']`, um só → 1 elemento, `''` → `['']`), o default de
  `BETTER_AUTH_URL`, e a herança das 5 chaves do schema do db.

Cuidado documentado: importar `pack-env` executa `schema.parse(process.env)` no
load. Testar só `schema` (não `env`) evita o problema.

Adicionar `"test": "bun test"` nos dois `package.json` — `turbo test` hoje pula
ambos em silêncio.

**Verificar:** `turbo run test --force` com os dois pacotes novos verdes.

**Executado.** `@pack/db` 10 testes, `@pack/auth` 5 — `turbo test` foi de 4 para
6 tasks, de 55 para 70 testes. Um desvio: as asserções de `schema/utils` liam
`col.config`, que o drizzle marca `protected` (passava em runtime, quebrava o
`tsc`). Reescrito para montar um `pgTable` de sonda e inspecionar via
`getTableConfig` — API pública, e exercita os helpers como o schema real os usa.
Os testes foram checados por mutação: removido o `.trim()` do transform de
`ORIGIN_ALLOWED`, a suíte de auth ficou 4 pass / 1 fail; restaurado, 5/0.
