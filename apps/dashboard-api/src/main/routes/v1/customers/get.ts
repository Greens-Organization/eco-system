import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { AppError } from '@pack/observability/errors';
import { listPage } from '@/main/infra/listing';
import type { Variables } from '..';
import { CUSTOMERS } from './data';
import {
  customerParamsSchema,
  customerSchema,
  customersQuerySchema,
  customersSchemaRes,
} from './schema';

export const getCustomersRoute = createRoute({
  tags: ['customers'],
  method: 'get',
  path: '/',
  request: { query: customersQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: customersSchemaRes } },
      description: 'A page of customers, filtered by `q` and `status`',
    },
  },
});

export const getCustomersHandler: RouteHandler<
  typeof getCustomersRoute,
  { Variables: Variables }
> = async (c) => {
  const { items, ...page } = listPage(
    CUSTOMERS,
    c.req.valid('query'),
    (customer) => [customer.name, customer.email]
  );
  return c.json({ customers: items, ...page }, 200);
};

export const getCustomerRoute = createRoute({
  tags: ['customers'],
  method: 'get',
  path: '/{id}',
  request: { params: customerParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: customerSchema } },
      description: 'One customer',
    },
  },
});

export const getCustomerHandler: RouteHandler<
  typeof getCustomerRoute,
  { Variables: Variables }
> = async (c) => {
  const { id } = c.req.valid('param');
  const customer = CUSTOMERS.find((item) => item.id === id);
  if (!customer) throw new AppError('NOT_FOUND', 'Customer not found');
  return c.json(customer, 200);
};
