import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export const chaves = () =>
  createEnv({
    server: {
      FLAGS_SECRET: z.string().min(1).optional(),
    },
    runtimeEnv: {
      FLAGS_SECRET: process.env.FLAGS_SECRET,
    },
  });
