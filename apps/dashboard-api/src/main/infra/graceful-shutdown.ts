import { disconnectCache } from '@pack/cache';
import { disconnectDatabase } from '@pack/db';
import { shutdownObservability } from '@pack/observability/instrumentation';
import { log } from '@pack/observability/logger';
import type { Server } from 'bun';

let isShuttingDown = false;

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

/**
 * Whether to register the graceful-shutdown handlers. Runs in ALL environments
 * unless explicitly opted out via SKIP_GRACEFUL — the prod-safe default.
 */
export function shouldRegisterGracefulShutdown(opts: {
  skip: boolean;
}): boolean {
  return !opts.skip;
}

/** What a drain closes, injected so the order can be tested. */
export type DrainSteps = {
  /** Stop accepting connections and resolve once in-flight requests end. */
  stopServer: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  closeCache: () => void | Promise<void>;
  flushObservability: () => Promise<void>;
};

/**
 * The drain, in the only safe order. `/ready` already answers 503 (the
 * shutdown flag), and the grace period lets the load balancer notice before
 * the listener closes. Then the server stops and is awaited, so the pool is
 * never closed under a request still using it.
 */
export async function drain(
  steps: DrainSteps,
  {
    gracePeriod,
    sleep = Bun.sleep,
  }: { gracePeriod: number; sleep?: (ms: number) => Promise<unknown> }
): Promise<void> {
  log.info('Waiting for the load balancer to drop this instance...');
  await sleep(gracePeriod);

  log.info('Stopping HTTP server (waiting for in-flight requests)...');
  await steps.stopServer();
  log.info('HTTP server stopped');

  await steps.closeDatabase();
  log.info('Database closed');

  await steps.closeCache();
  log.info('Redis closed');

  await steps.flushObservability();
  log.info('Observability flushed');
}

/** A requested stop exits 0; a crash exits 1 even when the drain went well. */
export function exitCodeFor(signal: string): 0 | 1 {
  return signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1;
}

/**
 * Whether Bun reloads this process on save (`--hot` in place, `--watch` by
 * restarting). Then a crash is usually an edit in progress (a file saved
 * half-written, an import that does not resolve yet), not a dying process.
 */
export function isDevReload(
  execArgv: readonly string[] = process.execArgv
): boolean {
  return execArgv.includes('--hot') || execArgv.includes('--watch');
}

/**
 * What an uncaught exception or unhandled rejection does. In production it
 * drains and exits 1 (the orchestrator restarts the process). Under
 * `--hot`/`--watch` it only logs: draining closes the database and Redis
 * under a process that Bun keeps alive and reloads on the next save, which
 * left a dev API answering 503 on /ready and hanging every sign-in.
 */
export function createCrashHandler(opts: {
  label: string;
  signal: string;
  devReload: boolean;
  isShuttingDown: () => boolean;
  shutdown: (signal: string) => Promise<void>;
}): (reason: unknown) => void {
  return (reason) => {
    if (opts.devReload) {
      log.error('{label} (bun --hot/--watch: still running, fix and save)', {
        label: opts.label,
        err: reason,
      });
      return;
    }
    log.error('{label}', { label: opts.label, err: reason });
    if (opts.isShuttingDown()) return;
    opts.shutdown(opts.signal).catch((err) => {
      log.error('Error during {label} shutdown', { label: opts.label, err });
      process.exit(1);
    });
  };
}

type ProcessHandler = [event: string, listener: (...args: never[]) => void];

const REGISTERED = Symbol.for('@app/dashboard-api/process-handlers');

/**
 * Registers process handlers, dropping the ones a previous run of this module
 * added. `--hot` re-runs the module on every save without a teardown hook
 * (oven-sh/bun#7337), so the old handlers would stack up, each bound to the
 * server of its own run. `once` events are re-armed the same way.
 */
export function replaceProcessHandlers(
  handlers: { on?: ProcessHandler[]; once?: ProcessHandler[] },
  target: NodeJS.EventEmitter = process
): void {
  const store = globalThis as { [REGISTERED]?: ProcessHandler[] };
  for (const [event, listener] of store[REGISTERED] ?? []) {
    target.off(event, listener as (...args: unknown[]) => void);
  }
  for (const [event, listener] of handlers.on ?? []) {
    target.on(event, listener as (...args: unknown[]) => void);
  }
  for (const [event, listener] of handlers.once ?? []) {
    target.once(event, listener as (...args: unknown[]) => void);
  }
  store[REGISTERED] = [...(handlers.on ?? []), ...(handlers.once ?? [])];
}

export function createGracefulShutdown(
  server: Server<unknown>,
  options = { timeout: 10_000, gracePeriod: 3000 }
) {
  async function shutdown(signal: string) {
    if (isShuttingDown) {
      log.warn('Shutdown already in progress');
      return;
    }

    isShuttingDown = true;
    log.info('{signal} received - starting graceful shutdown', { signal });

    const timeout = setTimeout(() => {
      log.error('Forced shutdown due to timeout');
      process.exit(1);
    }, options.timeout);

    try {
      await drain(
        {
          // false: let in-flight requests finish; the promise resolves then.
          stopServer: () => server.stop(false),
          closeDatabase: disconnectDatabase,
          closeCache: disconnectCache,
          flushObservability: shutdownObservability,
        },
        { gracePeriod: options.gracePeriod }
      );
      clearTimeout(timeout);
      log.info('Graceful shutdown completed');
      process.exit(exitCodeFor(signal));
    } catch (error) {
      log.error('Error during shutdown', { err: error });
      clearTimeout(timeout);
      process.exit(1);
    }
  }

  const devReload = isDevReload();
  const crash = (label: string, signal: string) =>
    createCrashHandler({
      label,
      signal,
      devReload,
      isShuttingDown: () => isShuttingDown,
      shutdown,
    });

  replaceProcessHandlers({
    // once: a second Ctrl+C falls through to the default and kills at once.
    once: [
      ['SIGTERM', () => shutdown('SIGTERM')],
      ['SIGINT', () => shutdown('SIGINT')],
    ],
    // on: a second crash while draining is logged, not left to the default.
    on: [
      ['uncaughtException', crash('Uncaught exception', 'UNCAUGHT_EXCEPTION')],
      [
        'unhandledRejection',
        crash('Unhandled rejection', 'UNHANDLED_REJECTION'),
      ],
    ],
  });
}
