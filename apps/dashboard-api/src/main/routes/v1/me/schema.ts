import z from 'zod';

export const meSchemaRes = z.object({
  id: z.string().openapi({ example: '01a0eee6-afdb-7000-9c68-d6cb59ff21e2' }),
  name: z.string().openapi({ example: 'Ada Lovelace' }),
  email: z.string().openapi({ example: 'ada@example.com' }),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  createdAt: z.string().openapi({ example: '2026-10-12T10:00:00.000Z' }),
});
