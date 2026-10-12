import { OpenAPIHono } from '@hono/zod-openapi';
import { handleZodError } from '@/main/infra/openapi/utils';
import type { Variables } from '../index';
import { getStatsHandler, getStatsRoute } from './get';

const statsRoutes = new OpenAPIHono<{ Variables: Variables }>({
  defaultHook: handleZodError,
}).openapi(getStatsRoute, getStatsHandler);

export default statsRoutes;
