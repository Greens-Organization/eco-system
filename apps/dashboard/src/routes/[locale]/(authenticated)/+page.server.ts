import { redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import { clearAuthCookies } from '$lib/server/auth-cookies';
import type { PageServerLoad } from './$types';

const StatsSchema = z.object({
  signups: z.array(z.object({ date: z.string(), count: z.number() })),
  totalUsers: z.number(),
  activeUsers: z.number(),
  totalRevenue: z.number(),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      user: z.string(),
      action: z.enum([
        'workspace_created',
        'billing_updated',
        'member_invited',
        'project_deleted',
      ]),
      timestamp: z.string(),
    })
  ),
});

type Stats = z.infer<typeof StatsSchema>;

export const load: PageServerLoad = async ({ request, locals, cookies }) => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const api = createApiClient(cookieHeader, locals.requestId);
  const result = await safeFetch<Stats>(
    api.stats.$get(),
    StatsSchema,
    locals.log
  );

  if (!result.success && result.status === 401) {
    clearAuthCookies(cookies);
    redirect(307, `/${locals.locale}/sign-in`);
  }

  return {
    stats: result.success ? result.data : null,
  };
};
