import { mkdirSync } from 'node:fs';
import os from 'node:os';
import { getFileSink } from '@logtape/file';
import {
  configureSync,
  disposeSync,
  getLogger as getLogTapeLogger,
  type Logger,
  type LogLevel,
  type Sink,
  type TextFormatter,
} from '@logtape/logtape';
import { redactByField } from '@logtape/redaction';
import { env } from '../../pack-env';
import { jsonLine, prettyLine } from './format';
import { toLogLevel } from './levels';
import { getOtelSink } from './otel-sink';
import { recordContext } from './record-context';

export { jsonLine, prettyLine, renderMessage } from './format';
export { spanToFields } from './record-context';
export type { Logger };

/** Every logger in the monorepo sits under this category. */
export const ROOT_CATEGORY = 'eco-system';

/** Per-process fields of the log contract, on every record. */
export const base = {
  service: env.SERVICE_NAME,
  environment: env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
  instance: env.HOSTNAME ?? os.hostname(),
  version: env.SERVICE_VERSION,
  ...(env.REGION ? { region: env.REGION } : {}),
};

/**
 * Last line of defence: credentials never reach a log line, wherever a
 * caller put them (nested objects too). Censored, not dropped, so the shape
 * stays. Exact names: LogTape's default list (`/key/i`, `/auth/i`,
 * `/email/i`…) would also hide fields like `cacheKey` or `authorized`.
 */
const SECRET_FIELD =
  /^(password|token|secret|authorization|cookie|set-cookie|access_?token|refresh_?token|id_?token|client_?secret)$/i;

export const redact = (sink: Sink): Sink =>
  redactByField(sink, {
    fieldPatterns: [SECRET_FIELD],
    action: () => '[redacted]',
  });

/** Synchronous writes to stdout: no record is lost on exit. */
export const stdoutSink =
  (formatter: TextFormatter): Sink =>
  (record) => {
    process.stdout.write(formatter(record));
  };

function defaultSinks(): Record<string, Sink> {
  const pretty = env.LOG_PRETTY ?? Boolean(process.stdout?.isTTY);
  const sinks: Record<string, Sink> = {
    stdout: stdoutSink(pretty ? prettyLine : jsonLine),
  };
  if (env.FILE_LOG) {
    mkdirSync('logs', { recursive: true });
    sinks.file = getFileSink('logs/app.log', { formatter: jsonLine });
  }
  // stdout stays the primary sink; OTLP gets a copy of each record.
  if (env.OTEL_EXPORTER_OTLP_ENDPOINT) sinks.otel = getOtelSink();
  return sinks;
}

/**
 * Configures LogTape for the process. Runs once when this module loads
 * (`reset` makes a second run, such as Vite's SSR
 * reloading the module, replace the first). A test that asserts on logs
 * calls it with its own sink and level, and calls it again bare to restore
 * the default.
 */
export function configureLogging(
  options: { level?: LogLevel | null; sinks?: Record<string, Sink> } = {}
): void {
  const level =
    options.level !== undefined
      ? options.level
      : env.VERBOSE
        ? 'debug'
        : toLogLevel(env.LOG_LEVEL);
  const sinks = Object.fromEntries(
    Object.entries(options.sinks ?? defaultSinks()).map(([id, sink]) => [
      id,
      redact(sink),
    ])
  );
  const ids = Object.keys(sinks);
  configureSync({
    reset: true,
    sinks,
    loggers:
      level === null
        ? []
        : [
            { category: ROOT_CATEGORY, lowestLevel: level, sinks: ids },
            // LogTape's own problems (a failing sink, a bad config).
            {
              category: ['logtape', 'meta'],
              lowestLevel: 'warning',
              sinks: ids,
            },
          ],
    contextLocalStorage: recordContext(base),
  });
}

configureLogging();

/** The root logger; `log.getChild('bot')` or `getLogger('bot')` for a part. */
export const log: Logger = getLogTapeLogger(ROOT_CATEGORY);

export const getLogger = (...category: [string, ...string[]]): Logger =>
  log.getChild(category);

/** Flushes and closes the sinks; the last call before the process exits. */
export const flushLogs = (): void => disposeSync();
