import z from 'zod';

export const customersSchemaRes = z.object({
  customers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        status: z.string(),
        createdAt: z.string(),
      })
    )
    .openapi({
      example: [
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          status: 'active',
          createdAt: '2024-01-15T10:00:00Z',
        },
      ],
    }),
  total: z.number().openapi({ example: 3 }),
});
