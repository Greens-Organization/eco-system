import { pingDatabase } from '@pack/db';
import { Hono } from 'hono';
import { isServerShuttingDown } from '@/main/infra/graceful-shutdown';

export type ReadyDeps = {
  ping: () => Promise<void>;
  isShuttingDown: () => boolean;
};

/**
 * Readiness probe — fit to receive traffic.
 *
 * Pings the DB (reusing the shared pool — no new connection) and returns 503
 * during shutdown, so k8s removes the pod from the Service before SIGTERM and
 * drains without dropping requests. Use this for `readinessProbe`.
 *
 * Dependencies are injected (DI) so the three branches are unit-testable
 * without a live database.
 */
export function createReadyRoute(deps: ReadyDeps) {
  const ready = new Hono();

  ready.get('/', async (c) => {
    if (deps.isShuttingDown()) {
      return c.json({ status: 'shutting_down' }, 503);
    }
    try {
      await deps.ping();
      return c.json({ status: 'ready' }, 200);
    } catch {
      return c.json({ status: 'not_ready', reason: 'database' }, 503);
    }
  });

  return ready;
}

export const ready = createReadyRoute({
  ping: pingDatabase,
  isShuttingDown: isServerShuttingDown,
});
