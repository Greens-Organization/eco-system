import { z } from '@hono/zod-openapi';
import { listQuerySchema, pageSchema } from '#main/infra/listing';
import { EMPLOYEE_STATUSES } from './data';

export const employeeSchema = z.object({
  id: z.string().openapi({ example: '1' }),
  name: z.string().openapi({ example: 'Erin Walsh' }),
  email: z.string().openapi({ example: 'erin.walsh@example.com' }),
  role: z.string().openapi({ example: 'Engineering Manager' }),
  department: z.string().openapi({ example: 'Engineering' }),
  status: z.enum(EMPLOYEE_STATUSES).openapi({ example: 'active' }),
});

export const employeesQuerySchema = listQuerySchema(EMPLOYEE_STATUSES);

export const employeesSchemaRes = pageSchema.extend({
  employees: z.array(employeeSchema),
});

export const employeeParamsSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: '1' }),
});
