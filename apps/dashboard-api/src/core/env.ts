import { schema as authSchema } from '@pack/auth/pack-env';
import { schema as emailSchema } from '@pack/email/pack-env';
import { schema as observabilitySchema } from '@pack/observability/pack-env';
import z from 'zod';

export const env = z
  .object({
    ...authSchema.shape,
    ...emailSchema.shape,
    ...observabilitySchema.shape,
    NODE_ENV: z.enum(['local', 'development', 'test', 'production']),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().default(3002),
    DEBUG: z
      .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
      .default(false),
    SKIP_GRACEFUL: z
      .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
      .default(false),
    SHOW_ROUTES: z
      .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
      .default(false),
  })
  .parse(process.env);

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isLocal = env.NODE_ENV === 'local';
export const debug = env.DEBUG;
