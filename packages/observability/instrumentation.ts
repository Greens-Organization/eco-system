import os from 'node:os';
import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from '@opentelemetry/sdk-trace-node';
import * as Sentry from '@sentry/bun';
import { env } from './pack-env';
import { scrubPii } from './sentry';

/**
 * Observability preload — imported first by the app entrypoint so the SDKs are
 * live before the first request. No-op without SENTRY_DSN / OTEL endpoint.
 *
 * Topology is DECOUPLED (D12): Sentry handles ERRORS only; OpenTelemetry sends
 * traces + metrics to Grafana via OTLP (independent provider). Nothing relies on
 * require-hook auto-instrumentation (HTTP spans come from `@hono/otel`), so
 * import order is not fragile on Bun.
 */
const sentryDsn = env.SENTRY_DSN;
const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;

let provider: NodeTracerProvider | undefined;
let meterProvider: MeterProvider | undefined;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    // Decoupled: skip Sentry's own OTel tracing and disable performance — traces
    // are owned by our OTel SDK (-> Grafana), not Sentry.
    skipOpenTelemetrySetup: true,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubPii,
    environment: env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
    release: env.SERVICE_VERSION,
  });
}

if (otlpEndpoint) {
  const resource = resourceFromAttributes({
    'service.name': env.OTEL_SERVICE_NAME ?? env.SERVICE_NAME,
    'service.version': env.SERVICE_VERSION,
    'deployment.environment': env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
    'service.instance.id': env.HOSTNAME ?? os.hostname(),
    ...(env.REGION ? { 'cloud.region': env.REGION } : {}),
  });

  // OTel 2.x: span processors go in the constructor (no addSpanProcessor).
  // Sampling is controlled by the standard OTEL_TRACES_SAMPLER[_ARG] env vars.
  provider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  provider.register();

  meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        exportIntervalMillis: env.OTEL_METRIC_EXPORT_INTERVAL,
      }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);
  new HostMetrics({ meterProvider, name: 'host-metrics' }).start();
}

/** Flush + close all exporters. Wired into the graceful shutdown (best-effort). */
export async function shutdownObservability(): Promise<void> {
  try {
    await provider?.shutdown();
  } catch {
    // best-effort
  }
  try {
    await meterProvider?.shutdown();
  } catch {
    // best-effort
  }
  try {
    await Sentry.close(2000);
  } catch {
    // best-effort: never block shutdown on telemetry flush
  }
}
