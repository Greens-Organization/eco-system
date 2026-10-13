import { redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import { readListQuery, toApiQuery } from '$lib/list-query';
import { EMPLOYEE_STATUSES } from '$lib/resources';
import { clearAuthCookies } from '$lib/server/auth-cookies';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 10;

const EmployeesSchema = z.object({
  employees: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      department: z.string(),
      status: z.enum(EMPLOYEE_STATUSES),
    })
  ),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
});

type Employees = z.infer<typeof EmployeesSchema>;

export const load: PageServerLoad = async ({
  request,
  locals,
  cookies,
  url,
}) => {
  const query = readListQuery(url, EMPLOYEE_STATUSES);
  const api = createApiClient(cookies, locals.requestId);
  const result = await safeFetch<Employees>(
    api.employees.$get({ query: toApiQuery(query, PAGE_SIZE) }),
    EmployeesSchema,
    locals.log
  );

  if (!result.success && result.status === 401) {
    clearAuthCookies(cookies);
    redirect(307, `/${locals.locale}/sign-in`);
  }

  return { query, employees: result.success ? result.data : null };
};
