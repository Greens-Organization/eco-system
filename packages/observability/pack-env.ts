import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const booleanSchema = z.stringbool({
  truthy: ['yes', 'true'],
  falsy: ['no', 'false'],
});

export const packEnv = () =>
  createEnv({
    server: {
      BETTERSTACK_API_KEY: z.string().min(1).optional(),
      BETTERSTACK_URL: z.url().optional(),

      // Added by Sentry Integration, Vercel Marketplace
      SENTRY_ORG: z.string().min(1).optional(),
      SENTRY_PROJECT: z.string().min(1).optional(),

      // Pino
      FILE_LOG: booleanSchema.default(false),
      LOG_PRETTY: booleanSchema.default(false),
      LOG_LEVEL: z.string().min(1).default('info'),
    },
    client: {
      // Added by Sentry Integration, Vercel Marketplace
      NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    },
    runtimeEnv: {
      BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
      BETTERSTACK_URL: process.env.BETTERSTACK_URL,
      SENTRY_ORG: process.env.SENTRY_ORG,
      SENTRY_PROJECT: process.env.SENTRY_PROJECT,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,

      FILE_LOG: process.env.FILE_LOG,
      LOG_PRETTY: process.env.LOG_PRETTY,
      LOG_LEVEL: process.env.LOG_LEVEL,
    },
  });
