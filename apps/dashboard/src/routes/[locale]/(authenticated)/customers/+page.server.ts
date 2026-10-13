import { redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import { readListQuery, toApiQuery } from '$lib/list-query';
import { CUSTOMER_STATUSES } from '$lib/resources';
import { clearAuthCookies } from '$lib/server/auth-cookies';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 10;

const CustomersSchema = z.object({
  customers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      status: z.enum(CUSTOMER_STATUSES),
      createdAt: z.string(),
    })
  ),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
});

type Customers = z.infer<typeof CustomersSchema>;

export const load: PageServerLoad = async ({
  request,
  locals,
  cookies,
  url,
}) => {
  const query = readListQuery(url, CUSTOMER_STATUSES);
  const api = createApiClient(cookies, locals.requestId);
  const result = await safeFetch<Customers>(
    api.customers.$get({ query: toApiQuery(query, PAGE_SIZE) }),
    CustomersSchema,
    locals.log
  );

  if (!result.success && result.status === 401) {
    clearAuthCookies(cookies);
    redirect(307, `/${locals.locale}/sign-in`);
  }

  return { query, customers: result.success ? result.data : null };
};
