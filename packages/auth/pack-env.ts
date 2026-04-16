import { schema as dbSchema } from '@pack/db/pack-env'
import { z } from 'zod'

export const schema = z.object({
  ...dbSchema.shape,
  BETTER_AUTH_URL: z.url().default('http://localhost:3002/'),
  BETTER_AUTH_SECRET: z.string().min(1),
  ORIGIN_ALLOWED: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim())),
})

export const env = schema.parse(process.env)
