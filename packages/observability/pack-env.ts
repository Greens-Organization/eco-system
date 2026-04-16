import { z } from 'zod'

export const schema = z.object({
  FILE_LOG: z
    .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
    .default(false),
  LOG_PRETTY: z
    .stringbool({ truthy: ['yes', 'true'], falsy: ['no', 'false'] })
    .default(false),
  LOG_LEVEL: z.string().min(1).default('info'),
})

export const env = schema.parse(process.env)
