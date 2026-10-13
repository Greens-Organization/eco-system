import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { AppError } from '@pack/observability/errors';
import { listPage } from '#main/infra/listing';
import type { Variables } from '..';
import { EMPLOYEES } from './data';
import {
  employeeParamsSchema,
  employeeSchema,
  employeesQuerySchema,
  employeesSchemaRes,
} from './schema';

export const getEmployeesRoute = createRoute({
  tags: ['employees'],
  method: 'get',
  path: '/',
  request: { query: employeesQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: employeesSchemaRes } },
      description: 'A page of employees, filtered by `q` and `status`',
    },
  },
});

export const getEmployeesHandler: RouteHandler<
  typeof getEmployeesRoute,
  { Variables: Variables }
> = async (c) => {
  const { items, ...page } = listPage(
    EMPLOYEES,
    c.req.valid('query'),
    (employee) => [
      employee.name,
      employee.email,
      employee.role,
      employee.department,
    ]
  );
  return c.json({ employees: items, ...page }, 200);
};

export const getEmployeeRoute = createRoute({
  tags: ['employees'],
  method: 'get',
  path: '/{id}',
  request: { params: employeeParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: employeeSchema } },
      description: 'One employee',
    },
  },
});

export const getEmployeeHandler: RouteHandler<
  typeof getEmployeeRoute,
  { Variables: Variables }
> = async (c) => {
  const { id } = c.req.valid('param');
  const employee = EMPLOYEES.find((item) => item.id === id);
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found');
  return c.json(employee, 200);
};
