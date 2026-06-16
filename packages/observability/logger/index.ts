import os from 'node:os';
import { type Span, trace } from '@opentelemetry/api';
import pino, {
  type Logger,
  type LoggerOptions,
  type TransportTargetOptions,
} from 'pino';
import { getContext } from '../context';
import { env } from '../pack-env';

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

export const log = pino(
  usePretty
    ? { ...loggerOptions, transport: { targets: transports } }
    : loggerOptions
);
