import {
  generateSupportId,
  parseCfRay,
  type RequestContext,
  runWithContext,
  setContext,
} from '@pack/observability/context';
import { type Logger, log } from '@pack/observability/logger';
import { createMiddleware } from 'hono/factory';
import type { RequestIdVariables } from 'hono/request-id';
import type { AuthVariables } from './auth-middleware';

export type LogVariables = {
  log: Logger;
  /** Per-request context, stashed on `c` so `onError` (outside the ALS scope) can read it. */
  obsContext?: RequestContext;
};

/**
 * Combined Hono Variables — what every handler can pull from `c.get(...)`.
 * Auth fields are present after `authMiddleware` runs.
 */
export type AppVariables = RequestIdVariables &
  LogVariables &
  Partial<AuthVariables>;

/** Access logs that are pure noise (uptime probes) — emitted at `debug`. */
const QUIET_PATHS = new Set(['/status', '/ready', '/health']);

/**
 * Observability middleware (replaces request-logger). Run AFTER `requestId()`.
 *
 *  - builds the per-request context (request_id, support_id, cf_ray_id, route,
 *    method, ip, user_agent) and runs the request inside the ALS scope, so
 *    every `log.*` from any layer is correlated via the Pino mixin;
 *  - stashes the context on `c` (`obsContext`) so the central error handler,
 *    which runs OUTSIDE the ALS scope, can still read support_id;
 *  - on response, records status_code/duration_ms and emits one access line.
 */
export const observability = () =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const ctx: RequestContext = {
      request_id: c.get('requestId'),
      support_id: generateSupportId(),
      cf_ray_id: parseCfRay(c.req.header('cf-ray')),
      route: c.req.routePath,
      method: c.req.method,
      ip:
        c.req.header('cf-connecting-ip') ??
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
      user_agent: c.req.header('user-agent'),
    };
    c.set('obsContext', ctx);
    c.set('log', log);

    const start = performance.now();
    await runWithContext(ctx, async () => {
      await next();

      const dur_ms = Math.round(performance.now() - start);
      setContext({ status_code: c.res.status, duration_ms: dur_ms });

      const fields = c.get('user') ? { user_id: c.get('user')?.id } : {};
      const msg = `${c.req.method} ${c.res.status} ${dur_ms}ms`;
      if (QUIET_PATHS.has(c.req.path)) log.debug(fields, msg);
      else log.info(fields, msg);
    });
  });
