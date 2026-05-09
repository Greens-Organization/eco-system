import z from 'zod';

export const statsSchemaRes = z.object({
  totalUsers: z.number().openapi({ example: 1205 }),
  activeUsers: z.number().openapi({ example: 342 }),
  totalRevenue: z.number().openapi({ example: 45231.89 }),
  recentActivity: z
    .array(
      z.object({
        id: z.string(),
        user: z.string(),
        action: z.string(),
        timestamp: z.string(),
      })
    )
    .openapi({
      example: [
        {
          id: '1',
          user: 'Alice',
          action: 'Logged in',
          timestamp: '2023-10-27T10:00:00Z',
        },
      ],
    }),
});
