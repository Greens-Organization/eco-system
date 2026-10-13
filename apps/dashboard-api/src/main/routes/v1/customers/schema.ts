import { z } from '@hono/zod-openapi';
import { listQuerySchema, pageSchema } from '@/main/infra/listing';
import { CUSTOMER_STATUSES } from './data';

export const customerSchema = z.object({
  id: z.string().openapi({ example: '1' }),
  name: z.string().openapi({ example: 'Alice Johnson' }),
  email: z.string().openapi({ example: 'alice.johnson@example.com' }),
  status: z.enum(CUSTOMER_STATUSES).openapi({ example: 'active' }),
  createdAt: z.string().openapi({ example: '2026-10-01T00:00:00.000Z' }),
});

export const customersQuerySchema = listQuerySchema(CUSTOMER_STATUSES);

export const customersSchemaRes = pageSchema.extend({
  customers: z.array(customerSchema),
});

export const customerParamsSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: '1' }),
});
