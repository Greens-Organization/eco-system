import { redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import { clearAuthCookies } from '$lib/server/auth-cookies';
import type { PageServerLoad } from './$types';

const CustomersSchema = z.object({
  customers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      status: z.string(),
      createdAt: z.string(),
    })
  ),
  total: z.number(),
});

type Customers = z.infer<typeof CustomersSchema>;

export const load: PageServerLoad = async ({ request, locals, cookies }) => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const api = createApiClient(cookieHeader, locals.requestId);
  const result = await safeFetch<Customers>(
    api.customers.$get(),
    CustomersSchema,
    locals.log
  );

  if (!result.success && result.status === 401) {
    clearAuthCookies(cookies);
    redirect(307, `/${locals.locale}/sign-in`);
  }

  return {
    customers: result.success ? result.data : null,
  };
};
