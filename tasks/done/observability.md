# Observabilidade — port do fastify-boilerplate para Hono + Bun

Port do contrato de observabilidade do `study/fastify-boilerplate` (OpenTelemetry +
Sentry + Grafana + Pino estruturado) para o `@pack/observability` do eco-system,
**re-implementado** para o runtime real do alvo: **Hono rodando em Bun** (não
Fastify/Node). Default off — no-op sem `SENTRY_DSN` / `OTEL_EXPORTER_OTLP_ENDPOINT`.

> Origem: `/plan-eng-review` sobre `study/fastify-boilerplate`. O boilerplate-fonte é
> Fastify+Node; o alvo é Hono+Bun. Várias peças não transferem 1:1 — ver §2.
>
> ✅ **Fase 0/1/2 implementadas e verificadas** (43 testes + smokes Bun). Reorg
> estrutural do package feito → `tasks/done/observability-structure.md`. Pendências
> extraídas para `tasks/todo/observability-followups.md` (F1 seção CLAUDE.md, F2
> verify manual Grafana, cards adiados). Nada commitado.

---

## 1. O que já existe no alvo (não rebuildar)

| Já existe | Onde | Reuso no port |
|---|---|---|
| Logger Pino | `packages/observability/logger/index.ts` | **Estende** com `base`+`mixin` (não rebuilda) |
| Errors (BaseError, SchemaError, error-code, utils) | `packages/observability/errors/` | **Enriquece** com classification/statusCode/userMessage |
| `statusToCode`/`codeToStatus` | `errors/utils.ts` | Reusa; adiciona `TOO_MANY_REQUESTS` (429) |
| `handleError` (Hono) | `apps/api/src/main/infra/error-handler.ts` | **Reescreve** pra classificar+rotear Sentry+support_id |
| `requestLogger` (child logger via `c.get('log')`) | `apps/api/src/main/middleware/request-logger.ts` | Relegado a atalho; ALS vira fonte de contexto |
| `graceful-shutdown` (SIGTERM/SIGINT/uncaught) | `apps/api/src/main/infra/graceful-shutdown.ts` | Reusa; **corrige bug** + amarra flush de observ. |
| `/health` (503 no drain) | `apps/api/src/main/routes/public/health.ts` | Vira `/ready`; cria `/status` (liveness puro) |
| `requestId()` middleware | `apps/api/src/main/app.ts:36` | Reusa como genReqId do contexto |
| `DRIZZLE_SQL_LOGS` | `.env.example` | Base pro slow-query log (DB spans = adiado) |

---

## 2. Por que não é copy-paste (Fastify+Node → Hono+Bun)

| Peça da fonte | Problema no Bun+Hono | Decisão |
|---|---|---|
| Preload `node --import instrumentation.js` | `bun build --compile` = binário único, sem flag de preload em prod | **Init programático** como 1º import do `server.ts`; `preload` no bunfig só pra dev (D4) |
| `@fastify/otel` (RED HTTP auto) | É de Fastify | Trocar por **`@hono/otel`** (middleware, funciona em Bun) |
| `instrumentation-http` (span HTTP auto) | `Bun.serve()` não é monkey-patchável | Spans HTTP via `@hono/otel` |
| `instrumentation-pino` (trace_id↔log) | Flaky no Bun (module resolution) | **Mixin manual** lendo `trace.getActiveSpan()` |
| `instrumentation-pg` (spans DB auto) | DB é `postgres.js`+Drizzle, não `pg` | **Adiado** (card) — wrapper manual fase 2 (D8) |
| `@sentry/node` | Bun tem SDK próprio | **`@sentry/bun`** |
| Transport worker do Pino | Briga com OTel (a fonte já pagou) | **JSON stdout + pipe `pino-pretty`** no dev (D6) |
| Hooks `onRequest`/`onResponse` (Fastify) | API de hook é de Fastify | **Middleware Hono** equivalente |
| `AsyncLocalStorage` | — | ✅ `node:async_hooks` funciona no Bun (D2) |
| Vitest (test runner) | Bun tem runner nativo Jest-compat (mesmo runtime) | **Trocar por `bun:test`** repo-wide (D9); fake timers via timeouts injetados |

---

## 3. Decisões travadas (via /plan-eng-review)

- **D1** — Escopo: contrato **completo**, faseado, adaptado a Bun.
- **D2** — Correlação: **ALS puro** (igual fonte). Middleware entra no ALS; `mixin` do
  Pino raiz puxa o contexto; `c.get('log')` vira atalho opcional.
- **D3** — Erro: **modelo único enriquecido**. `classification`/`statusCode`/
  `eventCategory`/`userMessage` no error base; `support_id` no `ErrorSchema`; 429 add;
  `handleError` classifica → loga → roteia Sentry (só technical/critical).
- **D4** — OTel init: **programático, 1º import** do `server.ts` (mantém `--compile`);
  `preload` no bunfig pra dev. `@hono/otel` é middleware (ordem de import robusta).
- **D5** — **Corrigir o bug** do graceful-shutdown em prod + teste de regressão.
- **D6** — Logger: **JSON no stdout sempre + pipe `pino-pretty`** no script de dev.
- **D7** — **Incluir** stack local Grafana LGTM no infra + `docker:obs:up`.
- **D8** — Spans de DB (postgres.js/Drizzle): **adiado** como card (fase 2).
- **D9** — Test runner: **full swap Vitest → `bun:test`** repo-wide. Remover Vitest do
  catalog/devDeps/`apps/api`. `bun test` no `apps/api` + packages backend. Re-introduzir
  Vitest cirúrgico só se/quando o dashboard precisar de teste de componente Svelte (YAGNI).
- **D10** — `@pack/testing`: **reaproveitar** como helper de `bun:test` (preload de env).
  `apps/api` já depende dele. Preload é **por-pacote** via `--preload @pack/testing/preload`
  (o bun não sobe ao bunfig da raiz — ver §5), **não** `bunfig [test].preload`. (As
  factories de mock `@sentry/bun`/db/fixtures não foram necessárias — não construídas.)
- **D11** — Logger opt-out: a API sai do pretty-transport (`LOG_PRETTY=false`) e pipa
  `| pino-pretty` no dev (evita conflito worker×OTel); o dashboard mantém o transport
  (sem OTel). O worker **não** foi removido do package.
- **D12** — Topologia **DESACOPLADA**: Sentry só erros (`skipOpenTelemetrySetup:true`,
  `tracesSampleRate:0`); OTel manda traces/métricas pro Grafana por provider próprio.
  Sem `@sentry/opentelemetry` SpanProcessor/Sampler/Propagator → ordem de import deixa
  de ser frágil no Bun.

---

## 4. Arquitetura alvo (Bun + Hono)

### Topologia
```
Sentry.init (só erros; skipOpenTelemetrySetup, tracesSampleRate:0) → Sentry (erros)
NodeTracerProvider ─ BatchSpanProcessor(OTLPTraceExporter) → Grafana (traces)
MeterProvider(PeriodicExportingMetricReader+OTLPMetricExporter) → Grafana (métricas)
HostMetrics ───────────────────────────────────────────────────→ Grafana (runtime/host)
@hono/otel middleware ─────────────────────────────────────────→ spans HTTP + route attrs
```
Default off: sem `SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT`, o bloco `enabled` nem roda.

### Wiring (Bun)
- **dev:** `bun run --hot ./src/server.ts` + `preload` no `bunfig.toml` apontando o
  `instrumentation.ts`; stdout passa por `| pino-pretty` no script.
- **prod:** `instrumentation.ts` importado como **1ª linha** do `server.ts` (entra no
  `bun build --compile`); JSON no stdout lido pelo coletor.

### Contrato de log em 3 camadas
- **Base** (Pino `base`): `service`, `environment`, `instance`, `version`, `region` — do env.
- **Per-request** (ALS via middleware): `request_id`, `support_id` (`SUP-`+hex),
  `cf_ray_id`, `route`, `method`, `status_code`, `duration_ms`, `ip`, `user_agent`.
  `trace_id`/`span_id` vêm do **mixin manual** (span ativo), não do ALS.
- **Per-event** (AppError): `error_code`, `classification`, `event_category`,
  `message`/`internal_message`/`user_message` + negócio/feature.

### Pipeline de erro (handleError central — ponto único)
```
erro → classifica → loga estruturado (SEMPRE)
     → business/validation: para aqui (sem Sentry)
     → technical/critical/desconhecido: Sentry.captureException (allowlist) + 5xx
     → resposta inclui support_id (usuário vê / manda pro suporte)
```
PII (ip/user_agent/atores): só no log; pro Sentry vai allowlist (`support_id`,
`error_code`, `classification`, `trace_id`, `route`, `method`, `status_code`).

---

## 5. Manifesto de arquivos

> ⚠️ **Layout do package reorganizado depois** (ver `tasks/done/observability-structure.md`):
> hoje é `context/`, `sentry/` (index+scrub), `errors/parse-error.ts`, barrel raiz
> `index.ts` + `exports` map. Os paths abaixo são da implementação original.

### `@pack/observability` (novos)
```
context.ts                    # ALS request-context + generateSupportId + parseCfRay
instrumentation.ts            # init OTel (traces+métricas) + Sentry + shutdownObservability — gated
sentry-scrub.ts               # beforeSend: scrub PII + sentryContextAllowlist
logger/index.ts               # (MODIFICA) + base + mixin(ALS + span ativo); remove transport worker
errors/app-error.ts           # (MODIFICA errors/) classification/statusCode/eventCategory/userMessage
errors/error-code.ts          # (MODIFICA) + TOO_MANY_REQUESTS (429)
pack-env.ts                   # (MODIFICA) + SENTRY_DSN, OTEL_*, SERVICE_*, DEPLOYMENT_ENV, REGION
package.json                  # (MODIFICA) + @opentelemetry/*, @sentry/bun, @hono/otel
log.ts                        # (REMOVE) console stub; error.ts passa a usar o Pino
```

### `apps/api` (wiring)
```
# (sem arquivo local) server.ts importa '@pack/observability/instrumentation' direto, 1ª linha
src/main/middleware/observability.ts         # entra no ALS (onRequest) + status/duration (onResponse)
src/main/middleware/index.ts                 # (MODIFICA) registra observability middleware + @hono/otel
src/main/app.ts                              # (MODIFICA) ordem: otel → requestId → observability → ...
src/main/infra/error-handler.ts              # (MODIFICA) classifica + roteia Sentry + support_id
src/main/infra/graceful-shutdown.ts          # (MODIFICA) flush observ.; FIX do registro (D5)
src/server.ts                                # (MODIFICA) 1º import instrumentation; FIX cond. graceful
src/main/routes/public/status.ts             # (NOVO) liveness puro (nunca 503)
src/main/routes/public/health.ts             # (MODIFICA→ready) SELECT 1 + 503 no shutdown
src/main/routes/public/index.ts              # (MODIFICA) registra /status + /ready
src/core/env.ts                              # já herda do pack-env (schema espalhado)
.env.example                                 # (MODIFICA) SENTRY_DSN, OTEL_*, SERVICE_*
package.json                                 # (MODIFICA) dev script com | pino-pretty; docker:obs
bunfig.toml (root)                           # (MODIFICA) preload dev
```

### infra
```
infra/docker/docker-compose.observability.yml  # (NOVO) grafana/otel-lgtm :3000/:4317/:4318
package.json (root)                              # (MODIFICA) docker:obs:up/down
```

### test runner (D9/D10) — ✅ FEITO (Fase 0)
```
package.json (root)                 # remove vitest devDep + catalogs.testing                  ✅
apps/api/package.json               # remove dep vitest (test script vem na Fase 1)             ✅
bunfig.toml (root)                  # SEM [test].preload — comentário explica o porquê          ✅
packages/testing/index.js → index.ts # factory Vitest React/jsdom → setTestEnv() helper        ✅
packages/testing/preload.ts          # (NOVO) preload bun:test: env limpo + observ. OFF         ✅
packages/testing/runner.test.ts      # (NOVO) smoke do runner + contrato do helper + preload   ✅
packages/testing/package.json        # exports ./ + ./preload; "test": bun test --preload ./preload.ts ✅
packages/testing/tsconfig.json       # extends bun.json (era svelte.json) + types:[bun,node]    ✅
```
**Wiring descoberto na execução (vale pra api/observability na Fase 1):**
- `bun test` NÃO sobe até o bunfig da raiz a partir do cwd de um subpacote. Logo, **preload é
  por-pacote** no script: consumidores usam `bun test --preload @pack/testing/preload`; o
  próprio `@pack/testing` usa `--preload ./preload.ts`. Sem `[test].preload` na raiz.
- `linker = "isolated"` (bunfig) exige **`types: ["bun","node"]` explícito** no tsconfig do
  pacote pra `@types/bun` (`bun:test`) e `@types/node` (`process`) resolverem no tsc.
- `bun test` **sai com código 1 quando não acha teste** → só adicionar script `test` a pacote
  que JÁ tem suite (api/observability ganham na Fase 1, junto com o 1º teste).
- Entrypoint canônico: `bun run test` (= `turbo test`, per-package) — nunca varre `study/`.
  Rodar `bun test` direto da raiz pega os testes do `study/` (projeto-referência) — não usar.
Re-add cirúrgico do Vitest só se o dashboard pedir teste de componente Svelte (D9).

---

## 6. Fases (vertical slices — revisar/verificar cada uma)

**Fase 0 — Tooling de teste (antes de escrever o 1º teste): ✅ FEITO**
full swap Vitest → `bun:test` (D9) + repurpose `@pack/testing` pra helpers/preload (D10).
"Make the change easy, then make the easy change" — define o runner antes de escrever os
testes. Greenfield, zero migração. Verificado: `bun run test` (turbo) verde (3/3), typecheck
ok, vitest fora das deps. Ver wiring por-pacote no §5.

**Fase 1 — Contrato agnóstico (sem exporters): ✅ FEITO**
errors enriquecido (T1) + ALS context (T2) + logger base/mixin (T3) + middleware
observability/support_id/cf_ray (T4) + handleError classificando (T5) + health split
(T6) + fix graceful D5 (T7) + remove log.ts console (T8). Tudo testável sem OTel/Sentry.
Verify: 35 testes turbo (testing 3 + observability 22 + api 10) + app real (access log
com contexto, /status 200, /ready 503 db-down). Bug de leak de message 5xx pego pelo
e2e e corrigido. Flush de observ. no graceful fica pra Fase 2 (precisa do shutdownObservability).

**Fase 2 — Exporters (gated default-off): ✅ FEITO**
Topologia DESACOPLADA (D12): Sentry só erros, OTel independente p/ Grafana.
instrumentation.ts (Sentry@bun + NodeTracerProvider/BatchSpanProcessor→OTLP +
MeterProvider→OTLP + HostMetrics) + @hono/otel middleware + mixin trace_id +
sentry-scrub + flush no graceful + LGTM compose (D7) + opt-out logger api (D11) +
pack-env/.env. Verify: 43 testes + smoke runtime Bun + smoke app (OTEL on→trace_id
no log / off→sem). Manual restante: docker:obs:up + ver trace no Grafana.

**Cards adiados:** spans DB postgres.js/Drizzle (D8); Logs→Loki via Alloy; sampling
dinâmico/tail-based.

---

## 7. Plano de testes (`bun:test` — D9)

**Estratégia de runner/mock:**
- Imports de `bun:test` (`describe`/`it`/`expect`/`mock`/`spyOn`/`beforeEach`). NÃO `vitest`/`vi`.
- Mock de módulo: `mock.module('@sentry/bun', ...)` e `spyOn`. Preload de env via
  `--preload @pack/testing/preload` **por-pacote** (o bun não sobe ao bunfig da raiz — ver §5).
- **Graceful-shutdown SEM fake timers** (bug conhecido do bun:test em 2026): injetar
  timeouts minúsculos via `options` (`createGracefulShutdown(server, {timeout: 50, gracePeriod: 10})`)
  e `spyOn(process, 'exit')`. Evita depender de `useFakeTimers`.
- Coverage: `bun test --coverage` (LCOV). Mesma meta de cobertura (§ diagrama).

**Unit:**
- `context`: formato `support_id` (`SUP-`+12hex upper); `parseCfRay` (`hash-GRU`→`hash`,
  sem `-`, undefined); `enterContext/getContext/setContext` merge; `setContext` fora de
  request = no-op.
- `sentry-scrub`: `sentryContextAllowlist` só campos permitidos; `scrubPii` remove
  user/cookies/authorization; `beforeSend` que lança → retorna `null` (não vaza PII).
- `errors`: `defaultClassification(status)` (400/422→validation, 5xx→technical, resto→
  business); `shouldReportToSentry` (business→false, technical→true); `statusToCode`/
  `codeToStatus` incl. 429; `SchemaError.fromZod`.
- `error-handler`: AppError business → só log, **sem** `captureException`; technical →
  log + Sentry com `support_id` na allowlist; desconhecido 5xx → technical + Sentry;
  OpenStatusApiError/HTTPException → status mapeado.
- `graceful-shutdown` **[REGRESSÃO/CRÍTICO]**: registra handler em prod (`!SKIP_GRACEFUL`);
  SIGTERM → drain → close db → flush → exit 0.
- `instrumentation`: `shutdownObservability` best-effort (não lança).

**E2E (Hono `app.fetch`):**
- Erro técnico → 5xx com `support_id` no corpo.
- Erro de negócio → 4xx, **sem** `captureException`.
- Rate-limit → 429 `TOO_MANY_REQUESTS` no corpo.
- `/status` → 200 sempre (mesmo no drain).
- `/ready` → 200 (db ok) / 503 (db down) / 503 (shutdown).
- **no-op:** sem `SENTRY_DSN`/`OTEL_*` → app sobe, nada exporta.

**Smoke (gated, com LGTM local):** span HTTP aparece no Grafana; RED metrics emitem.

---

## 8. Modos de falha

| Caminho | Falha | Tratado? | Usuário vê |
|---|---|---|---|
| preload desligado | sem DSN/OTEL | ✅ guard `enabled` (no-op) | app sobe normal |
| OTLP endpoint morto | Grafana down | ⚠️ BatchSpanProcessor dropa em silêncio (por design) | nada (traces perdidos) |
| Sentry down | DSN inválido | ✅ SDK não bloqueia request | nada |
| `beforeSend` lança | scrub com bug | ✅ try/catch → evento dropado (não vaza PII) | — |
| catch técnico | exceção não-tratada | ✅ handler → Sentry + `support_id` | 5xx + `support_id` |
| **deploy/SIGTERM** | **graceful não registrava em prod** | 🐛→✅ **fix D5 + regressão** | drain sem dropar request |
| pino-trace no Bun | mixin não acha span | ✅ mixin manual com fallback (sem trace_id, não quebra) | log sem trace_id |
| @hono/otel no Bun | middleware não emite span | ⚠️ verificar com LGTM local antes de confiar | nada (sem trace) |

**Gap crítico fechado:** o bug do graceful (D5) — antes silencioso em prod — ganha fix + teste.

---

## 9. NOT in scope (adiado, com motivo)

- **Spans de DB** (postgres.js/Drizzle) — net-new, incerteza no Bun; HTTP spans cobrem 80% (D8).
- **Logs → Loki via Alloy** — coleta de stdout é infra de cluster, fora do app (igual fonte).
- **Sampling dinâmico/tail-based** — começa com head sampling fixo (`OTEL_TRACES_SAMPLER_ARG`).
- **Observabilidade no dashboard SvelteKit** — app diferente; este card é só a API.
- **k8s manifests/HPA** — a fonte tem; o eco-system não tem k8s ainda. Card separado.

---

## 10. Env (novas vars no `@pack/observability/pack-env`)

No schema do `pack-env.ts`: `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_SERVICE_NAME`, `OTEL_METRIC_EXPORT_INTERVAL` (default 60000), `SERVICE_NAME`
(default `eco-system`), `SERVICE_VERSION`, `DEPLOYMENT_ENV`, `REGION`, `HOSTNAME`,
`LOG_PRETTY`, `LOG_LEVEL` (default `info`), `VERBOSE`, `FILE_LOG`. Todas opcionais/
defaulted — ausência = no-op.
`OTEL_TRACES_SAMPLER[_ARG]` **não** está no schema (lido direto pelo SDK OTel via env).

---

## 11. Paralelização (worktrees)

| Lane | Workstream | Módulos | Depende de |
|---|---|---|---|
| A | errors enriquecido + handler | `packages/observability/errors`, `apps/api/.../error-handler` | — |
| B | ALS context + logger + middleware | `packages/observability/{context,logger}`, `apps/api/.../middleware` | — |
| C | health split + graceful fix | `apps/api/.../routes/public`, `.../graceful-shutdown`, `server.ts` | — |
| D | instrumentation + sentry-scrub + LGTM + env | `packages/observability/{instrumentation,sentry-scrub,pack-env}`, infra | A+B (usa errors+logger) |

**Fase 0 (tooling de teste, T15/T16) é pré-requisito sequencial de A/B/C** — todas escrevem
testes em `bun:test`. Mergear Fase 0 primeiro (toca `bunfig.toml`, root `package.json`,
`@pack/testing`); depois A, B, C em paralelo. Lanes A, B, C são independentes → 3 worktrees.
D (fase 2) entra depois de A+B mergeados. Conflito potencial: A e B tocam ambos
`packages/observability/` (arquivos distintos, mas mesmo `package.json`/`index.ts` de barrel)
— coordenar os barrels. Fase 0 e Lane C tocam `package.json`/`bunfig` da raiz — sequenciar.

---

## 12. Implementation Tasks

- [x] **T1 (P1)** — errors: enriquecer com `classification`/`statusCode`/`eventCategory`/
  `userMessage` + `AppError` concreto; add `TOO_MANY_REQUESTS`(429); `support_id` no
  `ErrorSchema`. Verify: unit errors.
- [x] **T2 (P1)** — `context.ts`: ALS + `generateSupportId` + `parseCfRay`. Verify: unit context.
- [x] **T3 (P1)** — `logger/index.ts`: `base` + `mixin(ALS)`; remover transport worker →
  JSON stdout; dev script `| pino-pretty`. Verify: log sai com base+contexto.
- [x] **T4 (P1)** — middleware `observability.ts` (Hono): entra no ALS (onRequest) +
  status/duration (onResponse). Verify: e2e contexto no log.
- [x] **T5 (P1)** — reescrever `handleError`: classifica → loga → roteia Sentry →
  support_id no corpo. Verify: unit+e2e regra de ouro.
- [x] **T6 (P1)** — health split: `/status` (liveness) + `/ready` (SELECT 1 + 503 drain).
  Verify: e2e 200/503.
- [x] **T7 (P1, CRÍTICO)** — **fix graceful** (`!SKIP_GRACEFUL`, todos ambientes) +
  amarrar `shutdownObservability` + **teste de regressão**. Verify: unit regressão.
- [x] **T8 (P1)** — remover `log.ts` (console) e apontar `error.ts` pro Pino. Verify: typecheck.
- [x] **T9 (P2)** — `instrumentation.ts`: TracerProvider+MeterProvider+`@sentry/bun`+
  HostMetrics, gated `enabled`; `shutdownObservability`. 1º import no `server.ts`. Verify: no-op e2e.
- [x] **T10 (P2)** — `@hono/otel` middleware + mixin manual trace_id (span ativo). Verify: smoke LGTM.
- [x] **T11 (P2)** — `sentry-scrub.ts` + allowlist. Verify: unit scrub.
- [x] **T12 (P2)** — `pack-env` + `.env.example`: SENTRY/OTEL/SERVICE vars. Verify: parse.
- [x] **T13 (P2)** — LGTM compose + `docker:obs:up`/`down` + bunfig preload dev. Verify: `docker:obs:up`.
- [ ] **T14 (P3, card)** — spans DB postgres.js/Drizzle (hook logger Drizzle). Adiado (D8).
- [x] **T15 (P1, Fase 0)** — ✅ full swap Vitest → `bun:test`: vitest removido (devDep root +
  `catalogs.testing` + dep `apps/api`); preload por-pacote via `--preload` (root bunfig não
  aplica per-package). Verify: `bun run test` (turbo) verde; `grep -r vitest` limpo.
- [x] **T16 (P1, Fase 0)** — ✅ reaproveitar `@pack/testing`: `index.js` (factory Vitest
  React/jsdom) → `index.ts` com `setTestEnv()` + `preload.ts` + `runner.test.ts` (smoke);
  tsconfig `bun.json`+`types:[bun,node]`. Factories de mock (`@sentry/bun`/db) e fixtures
  (`RequestContext`/`AppError`) entram com seus deps nas Fases 1/2. Verify: 3/3 testes + typecheck.

---

## 13. CLAUDE.md → movido para follow-ups (F1)

Pendência **F1** em `tasks/todo/observability-followups.md`: adicionar seção
**Observabilidade** ao `CLAUDE.md` (contrato de log/erro, classification, support_id,
health split, default-off).
