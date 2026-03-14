import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const booleanSchema = z.stringbool({
  truthy: ['yes', 'true'],
  falsy: ['no', 'false'],
});

export const packEnv = () =>
  createEnv({
    server: {
      FILE_LOG: booleanSchema.default(false),
      LOG_PRETTY: booleanSchema.default(false),
      LOG_LEVEL: z.string().min(1).default('info'),
    },
    client: {},
    runtimeEnv: {
      FILE_LOG: process.env.FILE_LOG,
      LOG_PRETTY: process.env.LOG_PRETTY,
      LOG_LEVEL: process.env.LOG_LEVEL,
    },
  });
