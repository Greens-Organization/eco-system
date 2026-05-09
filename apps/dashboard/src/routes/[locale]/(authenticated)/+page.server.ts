import { redirect } from '@sveltejs/kit';
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

export const load: PageServerLoad = async ({ request, locals, cookies }) => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const api = createApiClient(cookieHeader, locals.requestId);
  const result = await safeFetch<Stats>(api.stats.$get());

  if (!result.success && result.status === 401) {
    for (const cookie of cookieHeader.split(';')) {
      const name = cookie.trim().split('=')[0] ?? '';
      if (name.startsWith('better-auth.')) cookies.delete(name, { path: '/' });
    }
    redirect(307, `/${locals.locale}/sign-in`);
  }

  return {
    stats: result.success ? result.data : null,
  };
};
