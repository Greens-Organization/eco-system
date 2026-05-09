import { z } from 'zod';

export const schema = z.object({
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string(),
});

export const env = schema.parse(process.env);
