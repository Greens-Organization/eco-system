import { OpenAPIHono } from '@hono/zod-openapi';
import { handleZodError } from '@/main/infra/openapi/utils';
import type { Variables } from '../index';
import { getEmployeesHandler, getEmployeesRoute } from './get';

const employeesRoutes = new OpenAPIHono<{ Variables: Variables }>({
  defaultHook: handleZodError,
}).openapi(getEmployeesRoute, getEmployeesHandler);

export default employeesRoutes;
