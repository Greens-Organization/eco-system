/**
 * Browser-side structured logger.
 *
 * Server logging lives in `@pack/observability/logger` (pino + pino-pretty)
 * and runs only in `+*.server.ts` / `hooks.server.ts`. Client code can't
 * import it — pino's transport relies on Node fs/worker_threads.
 *
 * This is a thin wrapper around `console` that:
 *  - tags every entry with a namespace + level for grep-ability in DevTools
 *  - swallows debug/info in production builds (stays in dev only)
 *  - keeps the `(payload, message)` shape so call sites match server logs
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

type LogFn = {
  (msg: string): void;
  (payload: object, msg?: string): void;
};

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: Level = import.meta.env.DEV ? 'debug' : 'info';
const minPriority = LEVEL_PRIORITY[minLevel];

function emit(level: Level, args: unknown[]): void {
  if (LEVEL_PRIORITY[level] < minPriority) return;
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'debug'
          ? console.debug
          : console.info;
  const tag = `[${level}]`;
  if (args.length === 0) return;
  if (typeof args[0] === 'string') {
    fn(tag, args[0]);
    return;
  }
  const [payload, ...rest] = args;
  if (typeof rest[0] === 'string') {
    fn(tag, rest[0], payload);
  } else {
    fn(tag, payload);
  }
}

const make = (level: Level): LogFn =>
  ((...args: unknown[]) => emit(level, args)) as LogFn;

export const log = {
  debug: make('debug'),
  info: make('info'),
  warn: make('warn'),
  error: make('error'),
};
