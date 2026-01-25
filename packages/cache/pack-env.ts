import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const packEnv = () =>
  createEnv({
    server: {
      REDIS_URL: z.url(),
    },
    client: {},
    runtimeEnv: {
      REDIS_URL: process.env.REDIS_URL,
    },
  });
