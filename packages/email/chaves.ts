import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export const chaves = () =>
  createEnv({
    server: {
      RESEND_FROM: z.email(),
      RESEND_TOKEN: z.string().min(1).startsWith('re_'),
    },
    runtimeEnv: {
      RESEND_FROM: process.env.RESEND_FROM,
      RESEND_TOKEN: process.env.RESEND_TOKEN,
    },
  });
