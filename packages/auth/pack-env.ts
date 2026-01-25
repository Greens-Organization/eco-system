import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const packEnv = () =>
  createEnv({
    server: {
      BETTER_AUTH_URL: z.url().default('http://localhost:3002/'),
      BETTER_AUTH_SECRET: z.string().min(1),
      ORIGIN_ALLOWED: z
        .string()
        .transform((value) => value.split(',').map((origin) => origin.trim())),
    },
    client: {},
    runtimeEnv: {
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      ORIGIN_ALLOWED: process.env.ORIGIN_ALLOWED,
    },
  });
