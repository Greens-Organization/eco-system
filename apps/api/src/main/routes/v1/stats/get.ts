import { createRoute } from '@hono/zod-openapi';
import type { RouteHandler } from '@hono/zod-openapi';
import { statsSchemaRes } from './schema';
import type { Variables } from '..';

export const getStatsRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: statsSchemaRes,
        },
      },
      description: 'Retrieve dashboard statistics',
    },
  },
});

export const getStatsHandler: RouteHandler<typeof getStatsRoute, { Variables: Variables }> = async (c) => {
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
};
