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
 *
 * Prior bug: only registered when `(isLocal || isDevelopment) && SKIP_GRACEFUL`,
 * so production never drained on SIGTERM. See tasks/todo/observability.md D5.
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
    log.info(`${signal} received - starting graceful shutdown`);

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
      log.error({ error }, 'Error during shutdown');
      clearTimeout(timeout);
      process.exit(1);
    }
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  process.once('uncaughtException', (error, origin) => {
    log.error({ error, origin }, 'Uncaught exception');
    if (!isShuttingDown) {
      shutdown('UNCAUGHT_EXCEPTION').catch((err) => {
        log.error({ err }, 'Error during uncaught exception shutdown');
        process.exit(1);
      });
    }
  });

  process.once('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled rejection');
    if (!isShuttingDown) {
      shutdown('UNHANDLED_REJECTION').catch((err) => {
        log.error({ err }, 'Error during unhandled rejection shutdown');
        process.exit(1);
      });
    }
  });
}
