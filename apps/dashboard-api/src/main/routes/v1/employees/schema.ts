import z from 'zod';

export const employeesSchemaRes = z.object({
  employees: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        department: z.string(),
        status: z.string(),
      })
    )
    .openapi({
      example: [
        {
          id: '1',
          name: 'Erin Walsh',
          email: 'erin.walsh@example.com',
          role: 'Engineering Manager',
          department: 'Engineering',
          status: 'active',
        },
      ],
    }),
  total: z.number().openapi({ example: 3 }),
});
