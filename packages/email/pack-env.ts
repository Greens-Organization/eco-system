import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const packEnv = () =>
  createEnv({
    server: {
      SMTP_HOST: z.string().optional(),
      SMTP_PORT: z.coerce.number().optional(),
      SMTP_USER: z.string().optional(),
      SMTP_PASS: z.string().optional(),
      SMTP_FROM: z.string(),
    },
    runtimeEnv: {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
    },
  });
