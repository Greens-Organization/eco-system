# Observabilidade — follow-ups (o que falta)

Implementação principal **feita e verificada** — ver `tasks/done/observability.md`
(Fase 0/1/2) e `tasks/done/observability-structure.md` (reorg do package). Aqui ficam
só as pontas que sobraram, cada uma com critério de aceite.

## Aberto — in-scope, não-bloqueante

- [ ] **F1 — Seção "Observabilidade" no `CLAUDE.md`** (era §13 do plano).
  Espelhar a do `study/fastify-boilerplate`, adaptada Bun+Hono.
  Conteúdo: contrato de log em 3 camadas (base / per-request via ALS / per-event via
  AppError), `classification` + roteamento Sentry (só technical/critical), `support_id`
  (`SUP-`+12hex), health split (`/status` liveness vs `/ready` readiness), default-off.
  **Aceite:** seção existe no `CLAUDE.md`; descreve o contrato real do código atual
  (não o da fonte Fastify).

- [ ] **F2 — Verify manual do round-trip Grafana** (era a nota solta da Fase 2 — o
  único item de verify ainda em aberto).
  Passos: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` no `.env` →
  `bun run docker:obs:up` → gerar tráfego na API → abrir `http://localhost:3000`.
  **Aceite:** ≥1 trace com `service.name=api` E ≥1 métrica RED/host visíveis no Grafana.
  Nota: o lado do app já está provado (OTEL on → `trace_id` no access log); falta só o
  export OTLP chegar no coletor (fire-and-forget, `BatchSpanProcessor` dropa em silêncio
  se o endpoint estiver morto — por isso precisa de verificação visual).

## Cards adiados — deliberado (D8 + §9 do plano original)

- [ ] **F3 (era T14) — Spans de DB** postgres.js/Drizzle (hook no logger do Drizzle). D8:
  net-new, incerteza no Bun; HTTP spans via `@hono/otel` já cobrem ~80%.
- [ ] **F4 — Testes p/ `instrumentation.ts` e `pack-env.ts`** — gap de cobertura
  pré-existente (ver `observability-structure.md` §8). Adicionar é trabalho de teste.
- [ ] **F5 — Logs → Loki via Alloy** — coleta de stdout = infra de cluster, fora do app.
- [ ] **F6 — Sampling dinâmico/tail-based** — hoje head sampling fixo via `OTEL_TRACES_SAMPLER[_ARG]` (lido pelo SDK).
- [ ] **F7 — Observabilidade no dashboard SvelteKit + k8s manifests/HPA** — apps/cards separados.

---

**Status:** F1/F2 são as únicas pendências in-scope. F3–F7 são deferidos por decisão
(não bloqueiam nada). Nenhuma ponta solta no plano principal — o que estava stale foi
corrigido antes de arquivar (`observability.md` §3/§4/§5/§7/§10).
