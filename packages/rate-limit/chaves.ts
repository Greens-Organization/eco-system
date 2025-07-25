import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const chaves = () =>
  createEnv({
    server: {
      UPSTASH_REDIS_REST_URL: z.url().optional(),
      UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    },
    runtimeEnv: {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  });
