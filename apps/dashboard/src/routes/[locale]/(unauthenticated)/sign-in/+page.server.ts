import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$lib/env';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    redirect(307, `/${locals.locale ?? defaultLocale}`);
  }
};

export const actions: Actions = {
  default: async ({ request, locals, cookies, url }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    let res: Response;
    try {
      res = await fetch(`${env.API_URL}/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') ?? '',
          Origin: url.origin,
        },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return fail(503, {
        error: 'Could not reach the server. Please try again later.',
      });
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<
        string,
        string
      >;
      return fail(res.status, {
        error: body['message'] ?? body['error'] ?? 'Sign in failed',
      });
    }

    // Forward all Set-Cookie headers from the API to the browser
    const rawSetCookie = res.headers.getSetCookie();
    for (const raw of rawSetCookie) {
      // Parse "name=value; Path=/; HttpOnly; SameSite=Lax; Max-Age=..."
      const parts = raw.split(';').map((p) => p.trim());
      const nameValue = parts[0] ?? '';
      const eqIdx = nameValue.indexOf('=');
      if (eqIdx < 1) continue;
      const name = nameValue.slice(0, eqIdx);
      const value = nameValue.slice(eqIdx + 1);
      const maxAge = parts.find((p) => p.toLowerCase().startsWith('max-age='));
      cookies.set(name, value, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: maxAge ? Number(maxAge.split('=')[1]) : undefined,
      });
    }

    const locale = locals.locale ?? defaultLocale;
    redirect(303, `/${locale}`);
  },
};
