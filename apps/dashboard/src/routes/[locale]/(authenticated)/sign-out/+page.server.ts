import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$lib/env';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, locals, url }) => {
    const cookie = request.headers.get('cookie') ?? '';

    try {
      const res = await fetch(`${env.API_URL}/auth/sign-out`, {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: url.origin,
        },
      });

      // Forward cookie-clearing headers from better-auth
      const rawSetCookie = res.headers.getSetCookie();
      for (const raw of rawSetCookie) {
        const parts = raw.split(';').map((p) => p.trim());
        const nameValue = parts[0] ?? '';
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx < 1) continue;
        const name = nameValue.slice(0, eqIdx);
        cookies.delete(name, { path: '/' });
      }
    } catch {
      return fail(503, { error: 'Could not reach the server.' });
    }

    const locale = locals.locale ?? defaultLocale;
    redirect(303, `/${locale}/sign-in`);
  },
};
