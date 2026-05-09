import { type Logger, log as rootLog } from '@pack/observability/logger';
import { createMiddleware } from 'hono/factory';
import type { RequestIdVariables } from 'hono/request-id';
import type { AuthVariables } from './auth-middleware';

export type LogVariables = {
  log: Logger;
};

/**
 * Combined Hono Variables type — what every route handler can pull from
 * `c.get(...)`. Auth fields are present after `authMiddleware` runs.
 */
export type AppVariables = RequestIdVariables &
  LogVariables &
  Partial<AuthVariables>;

/**
 * Paths whose access logs are pure noise (uptime probes, polling) — emit
 * at `debug` so they don't dominate prod ingestion. Edit-and-forget list.
 */
const QUIET_PATHS = new Set(['/health']);

/**
 * Single-line, structured request log replacement for `hono/logger`.
 *
 * Run AFTER `requestId()` (we read `c.get('requestId')`). For each request:
 *  - opens a child pino logger with `{ requestId, path }` bound and pushes
 *    it into `c.set('log', ...)` so handlers and downstream middleware
 *    share the same correlation context
 *  - awaits `next()`
 *  - emits one line: `${method} ${status} ${dur_ms}ms` with structured
 *    fields {method, status, dur_ms, user_id?} — `user_id` auto-included
 *    when `authMiddleware` populated `c.get('user')` for this request
 *  - downgrades QUIET_PATHS to `debug` so health probes don't drown prod
 *
 * Errors are not handled here — they bubble to `app.onError` which logs
 * them with the same `requestId`, keeping the correlation chain intact.
 */
export const requestLogger = () =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const requestId = c.get('requestId');
    const path = c.req.path;
    const log = rootLog.child({ requestId, path });

    c.set('log', log);

    const t0 = performance.now();
    await next();
    const dur_ms = Math.round(performance.now() - t0);

    const fields = {
      method: c.req.method,
      status: c.res.status,
      dur_ms,
      user_id: c.get('user')?.id,
    };
    const msg = `${c.req.method} ${c.res.status} ${dur_ms}ms`;

    if (QUIET_PATHS.has(path)) {
      log.debug(fields, msg);
    } else {
      log.info(fields, msg);
    }
  });
