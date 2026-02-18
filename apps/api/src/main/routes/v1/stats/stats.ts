import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

const statsRoute = new OpenAPIHono();

const statsSchema = z.object({
  totalUsers: z.number().openapi({ example: 1205 }),
  activeUsers: z.number().openapi({ example: 342 }),
  totalRevenue: z.number().openapi({ example: 45231.89 }),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      user: z.string(),
      action: z.string(),
      timestamp: z.string(),
    })
  ).openapi({
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

const getStatsRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: statsSchema,
        },
      },
      description: 'Retrieve dashboard statistics',
    },
  },
});

statsRoute.openapi(getStatsRoute, (c) => {
  return c.json({
    totalUsers: 12543,
    activeUsers: 234,
    totalRevenue: 54231.45,
    recentActivity: [
      {
        id: '1',
        user: 'Alice Johnson',
        action: 'Created a new workspace',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: '2',
        user: 'Bob Smith',
        action: 'Updated billing details',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: '3',
        user: 'Charlie Brown',
        action: 'Invited a team member',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '4',
        user: 'Diana Prince',
        action: 'Deleted a project',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
    ],
  });
});

export default statsRoute;
