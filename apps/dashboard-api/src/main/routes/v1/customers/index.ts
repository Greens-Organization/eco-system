import { OpenAPIHono } from '@hono/zod-openapi';
import { handleZodError } from '#main/infra/openapi/utils';
import type { Variables } from '../index';
import {
  getCustomerHandler,
  getCustomerRoute,
  getCustomersHandler,
  getCustomersRoute,
} from './get';

const customersRoutes = new OpenAPIHono<{ Variables: Variables }>({
  defaultHook: handleZodError,
})
  .openapi(getCustomersRoute, getCustomersHandler)
  .openapi(getCustomerRoute, getCustomerHandler);

export default customersRoutes;
