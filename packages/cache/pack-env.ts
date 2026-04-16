import { z } from 'zod'

export const schema = z.object({
  REDIS_URL: z.url(),
})

export const env = schema.parse(process.env)
