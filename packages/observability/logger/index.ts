import fs from 'node:fs';
import pino, { type TransportTargetOptions } from 'pino';
import { env } from '../pack-env';

const level = env.LOG_LEVEL;

const transports: TransportTargetOptions[] = [];

transports.push({
  level: 'info',
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname',
    messageFormat: '{msg}',
    hideObject: false,
    singleLine: false,
    useLevelLabels: true,
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
  // Use pretty priting in development, structured JSON in production
  ...(env.LOG_PRETTY && {
    transport: {
      targets: transports,
    },
  }),
});
