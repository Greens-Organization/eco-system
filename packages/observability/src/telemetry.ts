import os from 'node:os';
import { context, metrics, propagation, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { env } from '../pack-env';
import { scrubPii } from './sentry';
import { settleWithin } from './settle';

/**
 * Observability core, started by a runtime entry (`instrumentation.ts` with
 * `@sentry/bun` for the API, `instrumentation-node.ts` with `@sentry/node`
 * for the dashboard: `@sentry/bun` patches `Bun.serve` and fails under Node).
 * No-op without SENTRY_DSN / OTEL endpoint.
 *
 * Topology is DECOUPLED (D12): Sentry handles ERRORS only; OpenTelemetry sends
 * traces + metrics + logs to Grafana via OTLP (independent providers). Nothing
 * relies on require-hook auto-instrumentation (HTTP spans come from `@hono/otel`,
 * logs are bridged in-process from pino — see logger/otel-stream), so import
 * order is not fragile on Bun.
 */

/** What the core needs from a runtime's Sentry SDK. */
export interface SentrySdk {
  init(options: {
    dsn: string;
    skipOpenTelemetrySetup: boolean;
    tracesSampleRate: number;
    sendDefaultPii: boolean;
    beforeSend: typeof scrubPii;
    environment?: string;
    release: string;
  }): unknown;
  close(timeout?: number): Promise<boolean>;
}

let sentry: SentrySdk | undefined;
let provider: BasicTracerProvider | undefined;
let meterProvider: MeterProvider | undefined;
let loggerProvider: LoggerProvider | undefined;

export function startObservability(sdk: SentrySdk): void {
  const sentryDsn = env.SENTRY_DSN;
  const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (sentryDsn) {
    sentry = sdk;
    sdk.init({
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
    provider = new BasicTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    });
    // What NodeTracerProvider.register() did, spelled out (no Node-specific
    // SDK): the global provider, AsyncLocalStorage for the active span (Bun
    // implements node:async_hooks), and W3C traceparent + baggage propagation.
    trace.setGlobalTracerProvider(provider);
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable()
    );
    propagation.setGlobalPropagator(
      new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator(),
        ],
      })
    );

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

    // Logs: the pino logger bridges into this provider in-process (no worker —
    // see logger/otel-stream), exporting via OTLP (-> Loki in the lgtm stack).
    loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
    });
    logs.setGlobalLoggerProvider(loggerProvider);
  }
}

/** How long a shutdown waits for telemetry before moving on. */
export const FLUSH_BUDGET_MS = 2000;

/** Flush + close all exporters. Wired into the graceful shutdown (best-effort). */
export async function shutdownObservability(): Promise<void> {
  await settleWithin(
    [
      provider?.shutdown(),
      meterProvider?.shutdown(),
      loggerProvider?.shutdown(),
      sentry?.close(FLUSH_BUDGET_MS),
    ],
    FLUSH_BUDGET_MS
  );
}
