import { z } from 'zod'

export const schema = z.object({
  DATABASE_URL: z.url(),
  DRIZZLE_SQL_LOGS: z
    .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
    .default(false),
})

export const env = schema.parse(process.env)
export const connectionString = env.DATABASE_URL
