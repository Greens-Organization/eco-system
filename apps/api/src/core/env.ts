import { packEnv as analytics } from '@pack/analytics/pack-env';
import { packEnv as auth } from '@pack/auth/pack-env';
import { packEnv as database } from '@pack/db/pack-env';
import { packEnv as email } from '@pack/email/pack-env';
import { packEnv as observability } from '@pack/observability/pack-env';
import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

const booleanSchema = z.stringbool({
  truthy: ['yes', 'true'],
  falsy: ['no', 'false'],
});

export const env = createEnv({
  extends: [auth(), analytics(), database(), email(), observability()],
  server: {
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().default(3002),
    DEBUG: booleanSchema.default(false),
    SKIP_GRACEFUL: booleanSchema.default(false),
    SHOW_ROUTES: booleanSchema.default(false),
  },
  runtimeEnv: {
    HOST: process.env.HOST,
    PORT: process.env.PORT,
    DEBUG: process.env.DEBUG,
    SKIP_GRACEFUL: process.env.SKIP_GRACEFUL,
    SHOW_ROUTES: process.env.SHOW_ROUTES,
  },
});

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isLocal = process.env.NODE_ENV === ('local' as string);
export const debug = env.DEBUG;
