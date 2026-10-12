# Trace sampling — estratégia (F6)

Pesquisa de melhores práticas (2025–2026) + decisão para esta stack
(Bun + Hono + `@hono/otel` + `NodeTracerProvider` → `otel-lgtm`/Tempo).

## TL;DR

- **Manter 100% agora** (`parentbased_always_on`, default) está correto no volume
  atual. Guia do OTel: só vale samplear lá pra ~1000+ traces/s ou quando o custo
  doer. Single service local → mantém tudo.
- **App/SDK = só head sampling, e como knob de env (não constante no código).**
  `OTEL_TRACES_SAMPLER=parentbased_traceidratio` + `OTEL_TRACES_SAMPLER_ARG=0.1`.
  **Parent-based** é obrigatório em sistema distribuído: o root decide e os filhos/
  downstream herdam → nunca gera trace fragmentado.
- **"Dynamic/adaptive" sampling = tail sampling no Collector** (decide com o trace
  inteiro: erros, latência, atributos; com taxa auto-ajustável). Impossível no
  SDK, que decide no root span antes do trace existir.
- **Tail sampling NÃO cabe no `otel-lgtm`.** A imagem all-in-one tem um collector
  fixo que só repassa OTLP→Tempo/Prometheus/Loki; não expõe `tailsamplingprocessor`.
  Para tail sampling, um **OTel Collector (contrib) ou Grafana Alloy separado na
  frente** do otel-lgtm.
- **Spec 2025:** Consistent Probability Sampling (OTEP 235/250) já está na spec —
  threshold em `tracestate` (`ot=th:<hex>`) permite taxas diferentes por serviço
  ainda gerando traces coerentes + extrapolação da taxa real no backend. Ainda é
  *experimental* no SDK JS → adotar depois.

## Head vs tail vs dynamic

| | Quando decide | Vê o quê | Prós | Contras |
|---|---|---|---|---|
| **Head** | no root span | trace ID + ratio | barato, stateless, em qualquer lugar | cego ao conteúdo (não dá pra "guardar erros") |
| **Tail** | após o trace terminar | todos os spans | guarda erro/lento/atributo; taxa por rota | stateful, memória; precisa ver o trace inteiro |
| **Dynamic** | tail + taxa auto | idem tail | mantém o raro denso, o comum esparso | mesma complexidade do tail |

Prática comum: **head + tail juntos** — head barato na origem pra cortar volume
óbvio, tail no Collector pra garantir que os traces interessantes sobrevivem.

## Decisão para esta stack

**App/SDK (já pronto — knobs de env no `.env.example`, zero mudança de código):**
- Default dev: `parentbased_always_on` (keep all).
- Prod: `parentbased_traceidratio` + `0.1` (ajustar conforme o volume cresce).
- O `NodeTracerProvider` já lê esses env vars — **verificado** (com `always_off` a
  app gera `trace_id` mas exporta **0 traces** ao Tempo; com o default o mesmo
  `trace_id` aparece no Tempo — ver F2).
- **Nada de lógica baseada em conteúdo no SDK** (erro/latência) — é trabalho do
  Collector.

**Collector (onde o "dynamic" de fato acontece) — DEFERIDO:**
- otel-lgtm = backend, não camada de sampling. Para tail sampling: Collector/Alloy
  separado na frente. App → Alloy/Collector (tail_sampling) → otel-lgtm (Tempo).
- Política recomendada: **guardar todos os erros + todos os lentos + amostra
  probabilística do resto**, com `rate_limiting` opcional de teto.
- Em 1 réplica não precisa de load-balancing exporter; ao escalar o tier de
  sampling pra >1 instância, precisa de `routing_key=traceID` (senão decisão
  errada / rate-limit vazando). Span-metrics usam `routing_key=service` →
  pipelines/load-balancers distintos.

## Exemplo mínimo — tail sampling (Collector contrib na frente do otel-lgtm)

```yaml
receivers:
  otlp:
    protocols:
      http: { endpoint: 0.0.0.0:4318 }
      grpc: { endpoint: 0.0.0.0:4317 }

processors:
  tail_sampling:
    decision_wait: 10s          # > p99 da duração do trace, senão decide cedo demais
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      - name: keep-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: keep-slow
        type: latency
        latency: { threshold_ms: 2000 }
      - name: probabilistic-fallback
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
      # teto opcional contra picos:
      # - name: cap
      #   type: rate_limiting
      #   rate_limiting: { spans_per_second: 1500 }

exporters:
  otlp:
    endpoint: otel-lgtm:4317
    tls: { insecure: true }

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp]
```

Políticas são **OR** — o trace é mantido se qualquer policy disser "keep", então
erros e lentos ficam a 100% e o resto cai pra 10%.

## Armadilhas

- **Head sampling quebra métricas derivadas de span** (RED/throughput contam spans
  amostrados → parecem 10× menores). Computar métricas de dados **não-amostrados**,
  ou via connector **antes** do sampling; ou usar consistent sampling (threshold no
  `tracestate`) que permite extrapolar.
- **Gerar span-metrics ANTES de samplear** (o connector `spanmetrics` precisa do
  tráfego cheio). E `routing_key` conflita: spanmetrics=`service`, tail=`traceID`.
- **Traces fragmentados** ao misturar `always_on` com `traceidratio`, ou usar
  `TraceIDRatioBased` não-parent-based em spans não-root. Sempre `ParentBased`.
- **Tail sem trace-ID routing entre réplicas** → decisão errada. 1 réplica ok.
- **`decision_wait` curto** descarta spans tardios de traces lentos.
- **Não tentar tail-samplear dentro do otel-lgtm** — pipeline fixo, beco sem saída.

## Fontes

- OTel Sampling concepts — https://opentelemetry.io/docs/concepts/sampling/
- OTel JS Sampling — https://opentelemetry.io/docs/languages/js/sampling/
- OTel Trace SDK spec — https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OTel TraceState Probability Sampling — https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/
- Collector `tailsamplingprocessor` — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Collector `probabilisticsamplerprocessor` — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- Grafana Alloy `tail_sampling` — https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.tail_sampling/
- Grafana Alloy `loadbalancing` — https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.loadbalancing/
- Grafana otel-lgtm — https://grafana.com/blog/an-opentelemetry-backend-in-a-docker-image-introducing-grafana-otel-lgtm/
- Honeycomb Refinery — https://docs.honeycomb.io/manage-data-volume/refinery/
- Last9 — Consistent Probability Sampling — https://last9.io/blog/consistent-probability-sampling-fixes-fragmented-traces/
- Elastic — Fixing head-based sampling — https://www.elastic.co/observability-labs/blog/how-we-fixed-head-based-sampling-in-opentelemetry
- Uptrace — Head/Tail sampling — https://uptrace.dev/opentelemetry/sampling
