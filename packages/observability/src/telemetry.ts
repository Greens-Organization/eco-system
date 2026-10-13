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
import type { NodeOptions } from '@sentry/node';
import { env } from '../pack-env';
import { REQUEST_HEADER_ALLOWLIST, scrubPii } from './sentry';
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

/**
 * What the core needs from a runtime's Sentry SDK. `@sentry/bun` builds on
 * `@sentry/node`, so Node's options type checks both.
 */
export interface SentrySdk {
  init(options: NodeOptions): unknown;
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
    // `satisfies` so a renamed option fails `bun check` instead of being
    // ignored (Sentry 11 replaced skipOpenTelemetrySetup this way).
    const options = {
      dsn: sentryDsn,
      // Decoupled: Sentry does errors only. No Sentry tracer provider (the
      // default, spelled out) and no performance — traces are our OTel SDK's.
      enableOpenTelemetrySetup: false,
      tracesSampleRate: 0,
      // No load-time module hooks: they feed Sentry's own instrumentation,
      // which is off, and hooks are what we keep out of Bun.
      enableRuntimeChannelInjection: false,
      // Sentry 11 collects all of this by default; LGPD says none of it.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: {
          request: { allow: [...REQUEST_HEADER_ALLOWLIST] },
          response: false,
        },
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        queues: false,
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
        stackFrameVariables: false,
      },
      beforeSend: scrubPii,
      environment: env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
      release: env.SERVICE_VERSION,
    } satisfies NodeOptions;
    sdk.init(options);
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
      processors: [
        new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
      ],
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
