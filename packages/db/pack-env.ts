import { z } from 'zod';

export const schema = z.object({
  DATABASE_URL: z.url(),
  DRIZZLE_SQL_LOGS: z
    .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
    .default(false),
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  ADMIN_NAME: z.string().min(1).optional(),
});

export const env = schema.parse(process.env);
export const connectionString = env.DATABASE_URL;
