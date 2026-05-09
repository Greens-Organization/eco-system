import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { env } from '@/core/env';
import { CONSTANTS } from '@/infra/common/constants';
import { handleZodError } from '@/main/infra/openapi/utils';
import { type AppVariables, authMiddleware } from '@/main/middleware';
import statsRoute from './stats';

export type Variables = AppVariables;

export const v1 = new OpenAPIHono<{ Variables: Variables }>({
  defaultHook: handleZodError,
});

/**
 * Security Scheme: Better Auth Cookie
 */
v1.openAPIRegistry.registerComponent('securitySchemes', 'CookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'better-auth.session_token',
  description: 'Session cookie set by Better Auth after login',
});

/**
 * OpenAPI Specification
 */
v1.doc('/openapi', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Eco System API',
    contact: {
      email: 'contact@greens.lat',
      url: 'https://greens.lat',
    },
    description:
      'Eco System API allows you to monitor and manage your infrastructure health checks, workspaces, and more.\n\nTo get started, create an account and authenticate via Better Auth.',
  },
  tags: [
    {
      name: 'stats',
      description: 'Stats endpoints',
      'x-displayName': 'Stats',
    },
  ],
  security: [
    {
      CookieAuth: [],
    },
  ],
});

/**
 * Scalar API Documentation UI
 */
v1.get(
  '/',
  Scalar({
    url: `${CONSTANTS.API_REST_V1}/openapi`,
    servers: [
      {
        url: `http://localhost:${env.PORT}${CONSTANTS.API_REST_V1}`,
        description: 'Dev server',
      },
    ],
    theme: 'purple',
    layout: 'modern',
    metaData: {
      title: 'Eco System API',
      description: 'Start building with Eco System API',
      ogDescription: 'API Reference',
      ogTitle: 'Eco System API',
    },
  })
);

/**
 * Authentication middleware
 * Applied to all routes except /openapi (spec) and / (docs)
 */
v1.use('/*', authMiddleware);

/**
 * API Routes
 */
const routes = v1.route('/stats', statsRoute);

export default routes;
export type AppType = typeof routes;
