import os from 'node:os';
import { Writable } from 'node:stream';
import { type Span, trace } from '@opentelemetry/api';
import pino, {
  type Logger,
  type LoggerOptions,
  type TransportTargetOptions,
} from 'pino';
import { env } from '../../pack-env';
import { getContext } from '../context';
import { createOtelLogStream } from './otel-stream';

export type { Logger };

/** trace_id/span_id from an active OTel span (empty when none / OTel off). */
export function spanToFields(span: Span | undefined): Record<string, string> {
  if (!span) return {};
  const { traceId, spanId } = span.spanContext();
  return { trace_id: traceId, span_id: spanId };
}

/**
 * Pino options WITHOUT transport — the structured-log contract:
 *   - `base`: per-process fields (service/environment/instance/version/region)
 *   - `mixin`: per-request fields pulled from the ALS context (see ../context)
 *
 * `trace_id`/`span_id` are injected by the OTel span in Fase 2. Exported so
 * tests can build a logger over a capture stream (transport can't coexist
 * with a passed destination).
 */
export const loggerOptions = {
  level: env.VERBOSE ? 'debug' : env.LOG_LEVEL,
  base: {
    service: env.SERVICE_NAME,
    environment: env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
    instance: env.HOSTNAME ?? os.hostname(),
    version: env.SERVICE_VERSION,
    ...(env.REGION ? { region: env.REGION } : {}),
  },
  mixin() {
    return { ...(getContext() ?? {}), ...spanToFields(trace.getActiveSpan()) };
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
} satisfies LoggerOptions;

/**
 * Dev pretty-printing via in-process transport (worker thread). The API opts
 * out (`LOG_PRETTY=false`) and pipes `| pino-pretty` to dodge the worker×OTel
 * conflict (Fase 2); the dashboard keeps this path (no OTel). See D6/D11.
 */
const usePretty = env.LOG_PRETTY ?? Boolean(process.stdout?.isTTY);

const transports: TransportTargetOptions[] = [
  {
    level: 'info',
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,request_id,requestId,route,path',
      messageFormat:
        '{if request_id}[{request_id}] {end}{if requestId}[{requestId}] {end}{if route}{route} {end}{if path}{path} {end}{msg}',
      singleLine: true,
      levelFirst: true,
    },
  },
];

if (env.FILE_LOG) {
  transports.push({
    target: 'pino/file',
    options: { destination: './logs/app.log', mkdir: true },
  });
}

/**
 * When OTLP is enabled, stdout stays the primary sink and an in-process bridge
 * mirrors each record to OTel logs (-> Loki). Pretty mode (dashboard / TTY)
 * keeps the worker transport and opts out of the bridge — the API sets
 * `LOG_PRETTY=false` precisely so it lands on the OTel path. See ./otel-stream.
 */
const otelLogsEnabled = Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT);

function buildLogger(): Logger {
  if (usePretty) {
    return pino({ ...loggerOptions, transport: { targets: transports } });
  }
  if (otelLogsEnabled) {
    // stdout stays the primary sink; the OTel bridge mirrors each record. A
    // single synchronous destination (no multistream / no sonic-boom worker
    // buffering) guarantees every record reaches both sinks on the same tick —
    // multistream over an async sonic-boom destination starved the bridge.
    const otelStream = createOtelLogStream();
    const dual = new Writable({
      write(chunk, _encoding, callback) {
        process.stdout.write(chunk);
        otelStream.write(chunk);
        callback();
      },
    });
    return pino(loggerOptions, dual);
  }
  return pino(loggerOptions);
}

export const log = buildLogger();
