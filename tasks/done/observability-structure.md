# Reorganização estrutural do `@pack/observability`

Refactor **mecânico, behavior-preserving** do package `@pack/observability` para
deixar a estrutura uniforme e consistente com o resto do monorepo. Não muda
comportamento; os 30 testes existentes são a rede de regressão.

> Origem: `/plan-eng-review` sobre "colocar tudo em pasta e organizar certinho".
> Decisões travadas interativamente (ver §3).
>
> ✅ **EXECUTADO e verificado.** T1–T8 feitos. 30/30 testes verdes, tsc
> observability/api exit 0, biome limpo, dashboard resolve `/logger` (bundler +
> exports map). Nada commitado.

---

## 1. Estado anterior (pré-reorg — o que estava bagunçado)

```
observability/
  context.ts            context.test.ts        # flat + teste co-localizado
  error.ts                                     # parseError (0 callers) — colide com errors/
  instrumentation.ts
  pack-env.ts
  sentry.ts             sentry.test.ts         # 2 arquivos soltos sobre Sentry
  sentry-scrub.ts       sentry-scrub.test.ts
  errors/   (pasta + barrel)  errors.test.ts   # teste dentro da pasta
  logger/   (pasta, 1 arquivo) logger.test.ts  # teste dentro da pasta
  package.json   (SEM exports map)             # superfície pública indefinida
```

Três princípios de organização diferentes; sem barrel raiz nem `exports` map;
`error.ts` colide com `errors/`; testes ora na raiz ora na pasta; `redactError`
morto e bugado.

## 2. Estado-alvo (consistente com o monorepo)

Espelha `design-system` (pastas-de-domínio na raiz, sem `src/`), `auth`/`i18n`
(`exports` map), e a convenção `pack-env.ts` (db/auth/observability).

```
observability/
  index.ts              # NOVO barrel raiz (.) → errors+logger+context+sentry
  package.json          # + exports map (estilo auth)
  tsconfig.json
  pack-env.ts           # flat (convenção repo; api importa o subpath)
  instrumentation.ts    # flat (side-effectful, entrypoint dedicado)
  context/
    index.ts            # era context.ts
  errors/
    index.ts  app-error.ts  base-error.ts  classification.ts
    error-code.ts  schema-error.ts  utils.ts  parse-error.ts  # parse-error = era ../error.ts
  logger/
    index.ts
  sentry/               # NOVA pasta (capture + scrub juntos)
    index.ts            # era sentry.ts; re-exporta ./scrub
    scrub.ts            # era sentry-scrub.ts
  tests/                # NOVA — todos os *.test.ts centralizados
    context.test.ts  errors.test.ts  logger.test.ts
    sentry.test.ts   scrub.test.ts
```

### exports map (estilo `auth`, `moduleResolution: bundler` lê sem risco)
```jsonc
"exports": {
  ".": "./index.ts",
  "./errors": "./errors/index.ts",
  "./logger": "./logger/index.ts",
  "./context": "./context/index.ts",
  "./sentry": "./sentry/index.ts",
  "./instrumentation": "./instrumentation.ts",
  "./pack-env": "./pack-env.ts"
}
```
Barrel raiz re-exporta só os domínios **seguros**. `instrumentation` fica fora
(roda Sentry/OTel init no import — tem que ser entrypoint explícito); `pack-env`
fica subpath explícito (api importa `{ schema }`).

## 3. Decisões travadas

- **D1 — Profundidade:** reorg completo "tudo em pasta", porém **consistente com
  o monorepo** (pasta só p/ domínio multi-arquivo; `pack-env.ts`/`instrumentation.ts`
  flat). NÃO usar `src/` (só `tools` usa; `design-system` — o precedente multi-domínio
  — não usa).
- **D2 — Testes:** centralizados em `tests/` na raiz do package (não co-localizados).
- **D3 — exports map:** adicionar, estilo `auth`. Barrel raiz só domínios seguros.
- **D4 — Código morto:** **deletar `redactError`** (0 callers, bugado);
  **manter `parseError`** movido p/ `errors/parse-error.ts`, exportado pelo barrel.
- **D5 — pino-pretty `requestId`/`path`:** **NÃO mexer.** Não é leftover — o
  dashboard binda `requestId`/`path` (`hooks.server.ts:39`); o formatter cobre os
  dois contratos (dashboard `requestId`/`path` + API `request_id`/`route`) de
  propósito. Remover regrediria os logs do dashboard.

## 4. O que já existe (reusar, não rebuildar)

- `errors/` já é pasta com barrel → modelo seguido.
- `logger/` já é pasta → mantida.
- Consumidores já fazem deep-import por subpath → mantidos estáveis pelo exports map.
- `auth/package.json` → estilo de exports map copiado (inclusive `./pack-env`).

## 5. Blast radius (consumidores)

`git grep` dos subpaths: `/logger`×7, `/instrumentation`×2, `/errors`×2,
`/sentry`, `/context`, `/pack-env` (1× cada). **Todos no exports map com nome
estável → ZERO edição em `apps/api` e `apps/dashboard`.** Mover `sentry.ts`→
`sentry/index.ts` e `context.ts`→`context/index.ts` é transparente.

## 6. Implementation Tasks

- [x] **T1 (P1)** — `sentry/`: mover `sentry.ts`→`sentry/index.ts`,
  `sentry-scrub.ts`→`sentry/scrub.ts`; `sentry/index.ts` importa `./scrub` e
  re-exporta `scrubPii`/`sentryContextAllowlist`; atualizar `instrumentation.ts`
  (`./sentry-scrub`→`./sentry`). Verify: typecheck + sentry/scrub tests.
- [x] **T2 (P1)** — `context/`: mover `context.ts`→`context/index.ts`. Verify: context tests.
- [x] **T3 (P1)** — `parseError`: `error.ts`→`errors/parse-error.ts` (import
  `./logger`→`../logger`; arrow→`function`); `+export * from './parse-error'` no
  `errors/index.ts`; deletar `error.ts`. Verify: typecheck.
- [x] **T4 (P1)** — deletar `redactError` de `errors/utils.ts`. Verify: typecheck (0 callers).
- [x] **T5 (P1)** — `index.ts` barrel raiz: `export *` de errors/logger/context/sentry. Verify: typecheck.
- [x] **T6 (P1)** — `exports` map no `package.json` (§2). Verify: typecheck api+dashboard.
- [x] **T7 (P1)** — `tests/`: mover os 5 `*.test.ts` p/ `tests/`; reescrever imports
  relativos (`./x`→`../x`). Verify: `bun run test` = 30/30 (contagem exata).
- [x] **T8 (P1)** — Verify: `bun test` observability **30/30** + tsc
  observability/api **exit 0** + biome limpo + `@pack/observability/logger` resolve
  no dashboard (`moduleResolution: bundler` + exports map). ⚠️ `bun run build`/
  `svelte-check` do dashboard NÃO rodado (binário ausente no ambiente) — resolução
  provada por tsc direto; não bloqueia.

## 7. Failure modes

| Caminho | Falha | Tratado? | Verify |
|---|---|---|---|
| exports map incompleto | subpath fora do map quebra import do consumidor | ✅ map cobre os 6 subpaths + `.` | typecheck api+dashboard |
| `tests/` reescrita de import | path relativo errado → arquivo de teste não resolve / não roda | ⚠️ silencioso (some da contagem) | `bun run test` = **30 exatos**, não "≤30" |
| `scrubPii` órfão | esquecer de atualizar import em `instrumentation.ts` | ✅ T1 | grep `scrubPii` + sentry-scrub test |
| `errors` barrel puxa pino | `parse-error` importa `log` → quem importa `errors` carrega pino | ✅ aceitável (api já carrega; dashboard não importa `errors`) | dashboard typecheck+build |
| barrel raiz colisão de nome | `export *` com nome duplicado | ✅ verificado: sem colisão entre os 4 domínios | typecheck |

Nenhum gap crítico (sem teste + sem error-handling + silencioso): é reorg, não lógica nova.

## 8. NOT in scope (adiado, com motivo)

- **Testes p/ `instrumentation.ts` e `pack-env.ts`** — gap pré-existente; adicionar
  cobertura é trabalho de teste, não de organização. Card separado.
- **Renomear `pack-env`→`env`** — quebraria convenção repo (db/auth) + 1 import. Mantido.
- **`src/`** — diverge do monorepo (só `tools` usa). Descartado.
- **Tocar no pino-pretty `requestId`/`path`** — é bridge vivo do dashboard (D5).
- **Unificar naming base-fields (`service`) vs snake_case** — contrato de log, fora de "organizar".

## 9. Paralelização

Package pequeno; T5/T6/T7 tocam `index.ts`/`package.json`/`tests/` (serializam).
T1–T4 são quase independentes mas convergem no barrel/exports. **Largamente
sequencial — sem ganho real de worktree.** Ordem: T1→T2→T3→T4→T5→T6→T7→T8.

## 10. Resultados da verificação (executado)

- `bun test` (`packages/observability`): **30 pass / 0 fail**, 88 expects, 5 arquivos.
- `tsc --noEmit`: observability **exit 0**; api **exit 0** (prova o exports map no
  consumidor mais pesado — `/errors /logger /sentry /instrumentation /context /pack-env`).
- `biome check .` observability: **limpo** (22 arquivos).
- dashboard (`moduleResolution: bundler`): `@pack/observability/logger` resolve sem
  `Cannot find module` via exports map.
- Sweep: **0** refs a `sentry-scrub`/`redactError`; nenhum arquivo antigo sobrando.
- ⚠️ **Não** verificado: `bun run build` / `svelte-check` do dashboard (binário
  ausente no ambiente) — não bloqueia (resolução já provada por tsc). Gap de tooling
  pré-existente, não da mudança.
- Nada commitado.
