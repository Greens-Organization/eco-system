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
      log.info('Waiting for pending requests...');
      await Bun.sleep(options.gracePeriod);

      log.info('Stopping HTTP server...');
      server.stop();
      log.info('HTTP server stopped');

      log.info('Closing database...');
      await disconnectDatabase();
      log.info('Database closed');

      log.info('Flushing observability...');
      await shutdownObservability();

      clearTimeout(timeout);
      log.info('Graceful shutdown completed');
      process.exit(0);
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
