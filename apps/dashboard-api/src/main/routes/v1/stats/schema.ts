import z from 'zod';

export const ACTIVITY_ACTIONS = [
  'workspace_created',
  'billing_updated',
  'member_invited',
  'project_deleted',
] as const;

export const statsSchemaRes = z.object({
  signups: z
    .array(z.object({ date: z.string(), count: z.number().int() }))
    .openapi({
      description: 'Sign-ups per day, last 7 days, oldest first',
      example: [{ date: '2026-10-06', count: 12 }],
    }),
  totalUsers: z.number().openapi({ example: 1205 }),
  activeUsers: z.number().openapi({ example: 342 }),
  totalRevenue: z.number().openapi({ example: 45231.89 }),
  recentActivity: z
    .array(
      z.object({
        id: z.string(),
        user: z.string(),
        // A code, not a sentence: the dashboard words it per locale.
        action: z.enum(ACTIVITY_ACTIONS),
        timestamp: z.string(),
      })
    )
    .openapi({
      example: [
        {
          id: '1',
          user: 'Alice',
          action: 'workspace_created',
          timestamp: '2023-10-27T10:00:00Z',
        },
      ],
    }),
});
