import z from 'zod';

export const env = z
  .object({
    API_URL: z.url().default('http://localhost:3002'),
  })
  .parse(process.env);
