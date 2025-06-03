import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export const chaves = () =>
  createEnv({
    server: {
      ARCJET_KEY: z.string().min(1).startsWith('ajkey_').optional(),
    },
    runtimeEnv: {
      ARCJET_KEY: process.env.ARCJET_KEY,
    },
  });
