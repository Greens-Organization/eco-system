# Observabilidade — follow-ups (o que falta)

Implementação principal **feita e verificada** — ver `tasks/done/observability.md`
(Fase 0/1/2) e `tasks/done/observability-structure.md` (reorg do package). Aqui ficam
só as pontas que sobraram, cada uma com critério de aceite.

## Aberto — in-scope, não-bloqueante

- [x] **F1 — Seção "Observabilidade" no `CLAUDE.md`** (era §13 do plano).
  Espelhar a do `study/fastify-boilerplate`, adaptada Bun+Hono.
  Conteúdo: contrato de log em 3 camadas (base / per-request via ALS / per-event via
  AppError), `classification` + roteamento Sentry (só technical/critical), `support_id`
  (`SUP-`+12hex), health split (`/status` liveness vs `/ready` readiness), default-off.
  **Aceite:** seção existe no `CLAUDE.md`; descreve o contrato real do código atual
  (não o da fonte Fastify).
  **Feito:** `CLAUDE.md` §16 (project-specific) — descreve o contrato real do código
  atual (logger 3 camadas, classification→Sentry, support_id, /status vs /ready,
  topologia OTel desacoplada). Aponta para os arquivos-fonte reais.

- [x] **F2 — Verify do round-trip Grafana** (era a nota solta da Fase 2 — o
  único item de verify ainda em aberto).
  Passos: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` no `.env` →
  `bun run docker:obs:up` → gerar tráfego na API → abrir `http://localhost:3000`.
  **Aceite:** ≥1 trace com `service.name=api` E ≥1 métrica RED/host visíveis no Grafana.
  Nota: o lado do app já está provado (OTEL on → `trace_id` no access log); falta só o
  export OTLP chegar no coletor (fire-and-forget, `BatchSpanProcessor` dropa em silêncio
  se o endpoint estiver morto — por isso precisa de verificação visual).
  **Feito (2026-06-19):** stack `otel-lgtm` no ar; API com OTLP→`http://localhost:4318`;
  21 requests de tráfego. Confirmado **via as datasources do próprio Grafana**:
  Tempo recuperou o **mesmo `trace_id`** visto no access log da API + busca
  `service.name=api` → 20 traces; Prometheus tem `target_info{service_name="api"}`
  (labels `deployment_environment=local`, `service_version=0.0.0`, `job=api`).
  Zero erro de exporter no log. Round-trip OTLP→coletor provado; restam só os
  cards adiados F3–F7.

## Cards adiados — deliberado (D8 + §9 do plano original)

- [ ] **F3 (era T14) — Spans de DB** postgres.js/Drizzle (hook no logger do Drizzle). D8:
  net-new, incerteza no Bun; HTTP spans via `@hono/otel` já cobrem ~80%.
- [ ] **F4 — Testes p/ `instrumentation.ts` e `pack-env.ts`** — gap de cobertura
  pré-existente (ver `observability-structure.md` §8). Adicionar é trabalho de teste.
- [x] **F5 — Logs → Loki** — **feito (2026-06-19)** por uma rota diferente da Alloy:
  bridge **in-process** pino→OTLP-logs (`logger/otel-stream.ts` + `LoggerProvider` no
  `instrumentation.ts`), sem worker (evita o conflito Bun×OTel) e sem depender de coleta
  de stdout por sidecar. Logs vão via OTLP (`/v1/logs`) → coletor lgtm → Loki, com
  `service_name=api`, severidade mapeada e `trace_id`/`support_id`/`request_id` como
  atributos. **Gotcha resolvido:** `multistream` sobre `pino.destination(1)` (sonic-boom
  async) starvava o stream do bridge → trocado por um destino síncrono único (stdout +
  bridge no mesmo tick). Verificado: 8/8 access logs no Loki via Grafana. Teste:
  `tests/otel-log-bridge.test.ts`. (A rota Alloy/sidecar segue válida p/ k8s, mas não é
  mais necessária localmente.)
- [ ] **F6 — Sampling dinâmico/tail-based** — hoje head sampling fixo via `OTEL_TRACES_SAMPLER[_ARG]` (lido pelo SDK).
- [ ] **F7 — Observabilidade no dashboard SvelteKit + k8s manifests/HPA** — apps/cards separados.

---

**Status:** F1, F2 e F5 feitos (CLAUDE.md §16 + round-trip Grafana provado + logs→Loki
via bridge in-process). Nenhuma pendência in-scope. F3, F4, F6, F7 seguem deferidos
(não bloqueiam nada). Nenhuma ponta solta no plano principal — o que estava stale foi
corrigido antes de arquivar (`observability.md` §3/§4/§5/§7/§10).
