import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const booleanSchema = z.stringbool({
  truthy: ['yes', 'true'],
  falsy: ['no', 'false'],
});

export const packEnv = () =>
  createEnv({
    server: {
      DATABASE_URL: z.url(),
      DRIZZLE_SQL_LOGS: booleanSchema.default(false),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      DRIZZLE_SQL_LOGS: process.env.DRIZZLE_SQL_LOGS,
    },
  });

export const connectionString = packEnv().DATABASE_URL;
