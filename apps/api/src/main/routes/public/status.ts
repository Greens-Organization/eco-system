import { Hono } from 'hono';

/**
 * Liveness probe — the process is alive.
 *
 * Does NOT touch the DB and NEVER returns 503 on shutdown: otherwise k8s would
 * kill the pod mid-drain (liveness failure -> restart). Readiness for traffic
 * lives in `/ready`. Use this for `livenessProbe` and the container healthcheck.
 */
export const status = new Hono();

status.get('/', (c) => c.json({ status: 'ok' }));
