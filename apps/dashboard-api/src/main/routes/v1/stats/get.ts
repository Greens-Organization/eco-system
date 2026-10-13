import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { Variables } from '..';
import { statsSchemaRes } from './schema';

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

export const getStatsHandler: RouteHandler<
  typeof getStatsRoute,
  { Variables: Variables }
> = async (c) => {
  // Mock series: the last 7 days ending today, fixed counts.
  const COUNTS = [12, 18, 9, 24, 31, 17, 22];
  const today = new Date();
  const signups = COUNTS.map((count, i) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (COUNTS.length - 1 - i));
    return { date: day.toISOString().slice(0, 10), count };
  });

  return c.json({
    signups,
    totalUsers: 12543,
    activeUsers: 234,
    totalRevenue: 54231.45,
    recentActivity: [
      {
        id: '1',
        user: 'Alice Johnson',
        action: 'workspace_created',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: '2',
        user: 'Bob Smith',
        action: 'billing_updated',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: '3',
        user: 'Charlie Brown',
        action: 'member_invited',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '4',
        user: 'Diana Prince',
        action: 'project_deleted',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
    ],
  });
};
