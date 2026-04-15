import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { debug, env, isProduction } from '@/core/env';
import { CONSTANTS } from '@/infra/common/constants';
import { handleError } from './infra/error-handler';
import { publicRoute } from './routes/public';
import { v1 } from './routes/v1';

const app = new Hono({ strict: false });

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
 * Middlewares
 */
app.use('*', requestId());
if (debug) {
  app.use(logger());
}
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
