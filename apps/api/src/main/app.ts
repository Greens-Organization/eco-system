import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { showRoutes } from 'hono/dev';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { env, isProduction } from '@/core/env';
import { CONSTANTS } from '@/infra/common/constants';
import { handleError } from './infra/error-handler';
import { type AppVariables, requestLogger } from './middleware';
import { publicRoute } from './routes/public';
import { v1 } from './routes/v1';

const app = new Hono<{ Variables: AppVariables }>({ strict: false });

/**
 * Global CORS middleware
 * Must be first to handle preflight OPTIONS requests
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
 * Observability — order matters:
 *   `requestId()` runs first so `requestLogger` can pull the id and
 *   bind it to the per-request child logger that handlers inherit
 *   via `c.get('log')`.
 */
app.use('*', requestId());
app.use('*', requestLogger());
app.use('*', prettyJSON());

/**
 * Public routes (No auth)
 */
app.route('/', publicRoute);

/**
 * REST API v1
 */
app.route(CONSTANTS.API_REST_V1, v1);

if (!isProduction && env.SHOW_ROUTES) {
  showRoutes(app, {
    verbose: false,
    colorize: true,
  });
}

app.onError(handleError);

export default app;
