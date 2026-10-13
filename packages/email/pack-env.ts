import { z } from 'zod';

// `.env` files write an unset value as `KEY=` (empty string).
const optional = <T extends z.ZodType>(type: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), type.optional());

export const schema = z
  .object({
    SMTP_HOST: optional(z.string()),
    SMTP_PORT: optional(z.coerce.number().int().min(1).max(65_535)),
    SMTP_USER: optional(z.string()),
    SMTP_PASS: optional(z.string()),
    SMTP_FROM: z.string(),
  })
  // A host without a port used to become `port: NaN` on the first send.
  .refine((env) => !env.SMTP_HOST || env.SMTP_PORT !== undefined, {
    message: 'SMTP_PORT is required when SMTP_HOST is set',
    path: ['SMTP_PORT'],
  });

export const env = schema.parse(process.env);
