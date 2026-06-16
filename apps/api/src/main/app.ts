import { httpInstrumentationMiddleware } from '@hono/otel';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { showRoutes } from 'hono/dev';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { env, isProduction } from '@/core/env';
import { CONSTANTS } from '@/infra/common/constants';
import { handleError } from './infra/error-handler';
import { type AppVariables, observability } from './middleware';
import { publicRoute } from './routes/public';
import { v1 } from './routes/v1';

/**
 * Build a fully-wired Hono app. `server.ts` boots the default instance exported
 * below; tests call `buildApp()` to get a fresh, isolated app with no shared
 * state, so each e2e file can run the real stack in isolation.
 */
export function buildApp() {
  const app = new Hono<{ Variables: AppVariables }>({ strict: false });

  /**
   * Global CORS middleware. Must be first to handle preflight OPTIONS requests.
   */
  app.use(
    '*',
    cors({
      origin: env.ORIGIN_ALLOWED || ['http://localhost:3000'],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposeHeaders: ['Set-Cookie'],
    })
  );

  /**
   * Observability — order matters. `requestId()` seeds the id; `@hono/otel`
   * opens the HTTP span (no-op until the OTel SDK is configured) and wraps the
   * rest, so logs inside `observability()` carry trace_id/span_id via the Pino
   * mixin; `observability()` runs the request in the ALS scope (correlated logs
   * + support_id). See @pack/observability.
   */
  app.use('*', requestId());
  app.use('*', httpInstrumentationMiddleware());
  app.use('*', observability());
  app.use('*', prettyJSON());

  /**
   * Public routes (no auth) + REST API v1.
   */
  app.route('/', publicRoute);
  app.route(CONSTANTS.API_REST_V1, v1);

  if (!isProduction && env.SHOW_ROUTES) {
    showRoutes(app, { verbose: false, colorize: true });
  }

  app.onError(handleError);
  return app;
}

const app = buildApp();
export default app;
