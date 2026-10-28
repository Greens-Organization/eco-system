/**
 * Browser-side structured logger.
 *
 * Server logging lives in `@pack/observability/logger` (LogTape) and runs
 * only in `+*.server.ts` / `hooks.server.ts`: its context and sinks need
 * Node's AsyncLocalStorage and stdout.
 *
 * This is a thin wrapper around `console` that:
 *  - tags every entry with a namespace + level for grep-ability in DevTools
 *  - swallows debug/info in production builds (stays in dev only)
 *  - keeps the server's `(message, properties)` shape so call sites match
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

type LogFn = (message: string, properties?: object) => void;

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: Level = import.meta.env.DEV ? 'debug' : 'info';
const minPriority = LEVEL_PRIORITY[minLevel];

const CONSOLE = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
} satisfies Record<Level, (...args: unknown[]) => void>;

const make =
  (level: Level): LogFn =>
  (message, properties) => {
    if (LEVEL_PRIORITY[level] < minPriority) return;
    const tag = `[${level}]`;
    if (properties === undefined) CONSOLE[level](tag, message);
    else CONSOLE[level](tag, message, properties);
  };

export const log = {
  debug: make('debug'),
  info: make('info'),
  warn: make('warn'),
  error: make('error'),
};
