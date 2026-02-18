import { packEnv as core } from '@pack/next-config/pack-env';
import { packEnv as observability } from '@pack/observability/pack-env';
import { packEnv as security } from '@pack/security/pack-env';
import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

export const env = createEnv({
  extends: [core(), observability(), security()],
  server: {
    API_URL: z.url().default("http://localhost:3002")
  },
  client: {
  },
  runtimeEnv: {
    API_URL: process.env.API_URL
  },
});
