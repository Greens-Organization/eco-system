import { redirect } from '@sveltejs/kit';
import z from 'zod';
import { createApiClient } from '$lib/api/hono-client';
import { safeFetch } from '$lib/api/safe-fetch';
import type { PageServerLoad } from './$types';

const EmployeesSchema = z.object({
  employees: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      department: z.string(),
      status: z.string(),
    })
  ),
  total: z.number(),
});

type Employees = z.infer<typeof EmployeesSchema>;

export const load: PageServerLoad = async ({ request, locals, cookies }) => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const api = createApiClient(cookieHeader, locals.requestId);
  const result = await safeFetch<Employees>(
    api.employees.$get(),
    EmployeesSchema
  );

  if (!result.success && result.status === 401) {
    for (const cookie of cookieHeader.split(';')) {
      const name = cookie.trim().split('=')[0] ?? '';
      if (name.startsWith('better-auth.')) cookies.delete(name, { path: '/' });
    }
    redirect(307, `/${locals.locale}/sign-in`);
  }

  return {
    employees: result.success ? result.data : null,
  };
};
