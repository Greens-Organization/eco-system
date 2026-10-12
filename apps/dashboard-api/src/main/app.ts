import { httpInstrumentationMiddleware } from '@hono/otel';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { showRoutes } from 'hono/dev';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { env, isProduction } from '@/core/env';
import { CONSTANTS } from '@/infra/common/constants';
import { OpenStatusApiError } from '@/main/infra/openapi/utils';
import { handleError } from './infra/error-handler';
import { type AppVariables, observability } from './middleware';
import { publicRoute } from './routes/public';
import { v1 } from './routes/v1';

/**
 * Build a fully-wired Hono app. `server.ts` boots the default instance exported
 * below; tests call `buildApp()` to get a fresh, isolated app with no shared
 * state, so each e2e file can run the real stack in isolation.
 */
const MAX_BODY_BYTES = 1024 * 1024;

export function buildApp() {
  const app = new Hono<{ Variables: AppVariables }>({ strict: false });

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
   * Hardening. The API only answers the dashboard server (never a browser),
   * so these are defence in depth: standard security headers, and a body cap
   * so one request cannot hold memory hostage (auth and v1 bodies are tiny).
   * No hono/csrf: there is no browser session to forge here, and better-auth
   * checks the Origin of its own state-changing routes.
   */
  app.use('*', secureHeaders());
  app.use(
    '*',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: () => {
        throw new OpenStatusApiError({
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body over ${MAX_BODY_BYTES} bytes`,
        });
      },
    })
  );

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
