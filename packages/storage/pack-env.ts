import { z } from 'zod';

export const schema = z.object({
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('auto'),
  S3_ENDPOINT: z.url().optional(),
});

export const env = schema.parse(process.env);
