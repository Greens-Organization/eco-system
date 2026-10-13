import { error, redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import { EMPLOYEE_STATUSES } from '$lib/resources';
import { clearAuthCookies } from '$lib/server/auth-cookies';
import type { PageServerLoad } from './$types';

const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  department: z.string(),
  status: z.enum(EMPLOYEE_STATUSES),
});

type Employee = z.infer<typeof EmployeeSchema>;

export const load: PageServerLoad = async ({
  params,
  request,
  locals,
  cookies,
}) => {
  const api = createApiClient(cookies, locals.requestId);
  const result = await safeFetch<Employee>(
    api.employees[':id'].$get({ param: { id: params.id } }),
    EmployeeSchema,
    locals.log
  );

  if (!result.success) {
    if (result.status === 401) {
      clearAuthCookies(cookies);
      redirect(307, `/${locals.locale}/sign-in`);
    }
    error(result.status === 404 ? 404 : 500, result.error);
  }
  return { employee: result.data };
};
