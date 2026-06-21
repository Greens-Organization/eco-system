import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { Variables } from '..';
import { employeesSchemaRes } from './schema';

export const getEmployeesRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: employeesSchemaRes,
        },
      },
      description: 'List employees',
    },
  },
});

export const getEmployeesHandler: RouteHandler<
  typeof getEmployeesRoute,
  { Variables: Variables }
> = async (c) => {
  const employees = [
    {
      id: '1',
      name: 'Erin Walsh',
      email: 'erin.walsh@example.com',
      role: 'Engineering Manager',
      department: 'Engineering',
      status: 'active',
    },
    {
      id: '2',
      name: 'Frank Ocean',
      email: 'frank.ocean@example.com',
      role: 'Backend Engineer',
      department: 'Engineering',
      status: 'active',
    },
    {
      id: '3',
      name: 'Grace Hopper',
      email: 'grace.hopper@example.com',
      role: 'Product Designer',
      department: 'Design',
      status: 'active',
    },
    {
      id: '4',
      name: 'Henry Ford',
      email: 'henry.ford@example.com',
      role: 'Sales Lead',
      department: 'Sales',
      status: 'inactive',
    },
  ];

  return c.json({ employees, total: employees.length });
};
