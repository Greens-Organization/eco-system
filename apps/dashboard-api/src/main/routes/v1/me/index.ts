import { OpenAPIHono } from '@hono/zod-openapi';
import { handleZodError } from '#main/infra/openapi/utils';
import type { Variables } from '../index';
import { getMeHandler, getMeRoute } from './get';

const meRoutes = new OpenAPIHono<{ Variables: Variables }>({
  defaultHook: handleZodError,
}).openapi(getMeRoute, getMeHandler);

export default meRoutes;
