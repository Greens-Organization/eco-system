import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { Variables } from '..';
import { customersSchemaRes } from './schema';

export const getCustomersRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: customersSchemaRes,
        },
      },
      description: 'List customers',
    },
  },
});

export const getCustomersHandler: RouteHandler<
  typeof getCustomersRoute,
  { Variables: Variables }
> = async (c) => {
  const customers = [
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      status: 'active',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: '2',
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      status: 'active',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
    {
      id: '3',
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: '4',
      name: 'Diana Prince',
      email: 'diana.prince@example.com',
      status: 'inactive',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    },
  ];

  return c.json({ customers, total: customers.length });
};
