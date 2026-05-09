import fs from 'node:fs';
import pino, { type Logger, type TransportTargetOptions } from 'pino';
import { env } from '../pack-env';

export type { Logger };

const level = env.LOG_LEVEL;

const transports: TransportTargetOptions[] = [];

transports.push({
  level: 'info',
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss',
    // Hide fields that are inlined into messageFormat below, plus the
    // usual noise. Anything else still gets printed as JSON next to the
    // line (singleLine collapses it).
    ignore: 'pid,hostname,requestId,path',
    // Inline reqId + path before the message so each line is greppable
    // by request without expanding the JSON blob:
    //   12:34:56 INFO  [a3b1c2d4] POST /en/sign-in signin:attempt
    messageFormat:
      '{if requestId}[{requestId}] {end}{if path}{path} {end}{msg}',
    singleLine: true,
    levelFirst: true,
  },
});

if (env.FILE_LOG) {
  const logDirectory = './logs';

  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
  }

  transports.push({
    target: 'pino/file',
    options: {
      destination: `${logDirectory}/app.log`,
      mkdir: true,
    },
  });
}

// Pretty when stdout is an interactive terminal (dev), JSON otherwise (CI,
// containers, prod). `LOG_PRETTY` env var, when explicitly set, overrides
// the heuristic — handy for forcing JSON in a TTY or pretty in CI.
const usePretty = env.LOG_PRETTY ?? Boolean(process.stdout?.isTTY);

/**
 * Examples:
 * ```ts
 * log.error('This is a error log.');
 * ```
 * ```ts
 * log.debug('This is a debug log.');
 * ```
 * ```ts
 * log.warn('This is a warn log.');
 * ```
 * ```ts
 * log.info({ user: 'john_doe', action: 'login_attempt' }, 'User action.');
 * ```
 */
export const log = pino({
  level,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  ...(usePretty && {
    transport: {
      targets: transports,
    },
  }),
});
