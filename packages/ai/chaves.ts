import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export const chaves = () =>
  createEnv({
    server: {
      OPENAI_API_KEY: z.string().min(1).startsWith('sk-').optional(),
    },
    runtimeEnv: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  });
