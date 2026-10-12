import { schema as dbSchema } from '@pack/db/pack-env';
import { z } from 'zod';
import { CLIENT_IP_SECRET_MIN_LENGTH } from './src/client-ip';

export const schema = z.object({
  ...dbSchema.shape,
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: z.string().min(1),
  // Shared with the dashboard, which signs the client IP it forwards.
  CLIENT_IP_SECRET: z.string().min(CLIENT_IP_SECRET_MIN_LENGTH),
  ORIGIN_ALLOWED: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

export const env = schema.parse(process.env);
