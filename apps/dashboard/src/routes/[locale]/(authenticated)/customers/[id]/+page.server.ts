import { error, redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '#lib/api/hono-client.js';
import { safeFetch } from '#lib/api/safe-fetch.js';
import { CUSTOMER_STATUSES } from '#lib/resources.js';
import { clearAuthCookies } from '#lib/server/auth-cookies.js';
import type { PageServerLoad } from './$types';

const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.enum(CUSTOMER_STATUSES),
  createdAt: z.string(),
});

type Customer = z.infer<typeof CustomerSchema>;

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
  const api = createApiClient(cookies, locals.requestId);
  const result = await safeFetch<Customer>(
    api.customers[':id'].$get({ param: { id: params.id } }),
    CustomerSchema,
    locals.log
  );

  if (!result.success) {
    if (result.status === 401) {
      clearAuthCookies(cookies);
      redirect(307, `/${locals.locale}/sign-in`);
    }
    error(result.status === 404 ? 404 : 500, result.error);
  }
  return { customer: result.data };
};
