import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import type { PageServerLoad } from './$types';

const StatsSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  totalRevenue: z.number(),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      user: z.string(),
      action: z.string(),
      timestamp: z.string(),
    })
  ),
});

type Stats = z.infer<typeof StatsSchema>;

export const load: PageServerLoad = async ({ request }) => {
  const api = createApiClient(request.headers.get('cookie') ?? '');
  const result = await safeFetch<Stats>(api.stats.$get());

  return {
    stats: result.success ? result.data : null,
  };
};
