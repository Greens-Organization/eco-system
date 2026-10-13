import { OpenAPIHono } from '@hono/zod-openapi';
import { handleZodError } from '#main/infra/openapi/utils';
import type { Variables } from '../index';
import {
  getEmployeeHandler,
  getEmployeeRoute,
  getEmployeesHandler,
  getEmployeesRoute,
} from './get';

const employeesRoutes = new OpenAPIHono<{ Variables: Variables }>({
  defaultHook: handleZodError,
})
  .openapi(getEmployeesRoute, getEmployeesHandler)
  .openapi(getEmployeeRoute, getEmployeeHandler);

export default employeesRoutes;
