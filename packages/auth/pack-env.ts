import { schema as dbSchema } from '@pack/db/pack-env';
import { schema as emailSchema } from '@pack/email/pack-env';
import { z } from 'zod';
import { CLIENT_IP_SECRET_MIN_LENGTH } from './src/client-ip';

export const schema = z.object({
  ...dbSchema.shape,
  ...emailSchema.shape,
  // The dashboard's public URL. No default: a localhost fallback in
  // production would silently turn secure cookies off.
  BETTER_AUTH_URL: z.url(),
  // Signs session cookies; shared with the dashboard. A placeholder such as
  // "32-length" is rejected by the length alone.
  BETTER_AUTH_SECRET: z
    .string()
    .min(
      32,
      'BETTER_AUTH_SECRET needs 32+ characters (openssl rand -base64 32)'
    ),
  // Shared with the dashboard, which signs the client IP it forwards.
  CLIENT_IP_SECRET: z.string().min(CLIENT_IP_SECRET_MIN_LENGTH),
  ORIGIN_ALLOWED: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.url()).min(1, 'ORIGIN_ALLOWED needs at least one origin')),
});

export const env = schema.parse(process.env);
