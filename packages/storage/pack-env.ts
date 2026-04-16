import { z } from 'zod'

export const schema = z.object({
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
})

export const env = schema.parse(process.env)
