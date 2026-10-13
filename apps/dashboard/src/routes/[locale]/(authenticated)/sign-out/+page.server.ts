import { defaultLocale } from '@pack/i18n';
import { redirect } from '@sveltejs/kit';
import { authFetch, reasonFor } from '#lib/auth-proxy.js';
import { env } from '#lib/env.js';
import { clearAuthCookies } from '#lib/server/auth-cookies.js';
import type { Actions } from './$types';

export const actions: Actions = {
  // The browser is signed out whatever the API answers: revoking the session
  // there is best effort, and a failure must not leave the cookies behind.
  default: async ({ request, cookies, locals, url, getClientAddress }) => {
    const t0 = performance.now();
    locals.log.info('auth.signout.attempt');

    const result = await authFetch(`${env.API_URL}/auth/sign-out`, {
      method: 'POST',
      requestId: locals.requestId,
      clientIp: getClientAddress(),
      clientIpSecret: env.CLIENT_IP_SECRET,
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
        Origin: url.origin,
      },
    });

    const dur_ms = Math.round(performance.now() - t0);

    if (result.ok) {
      locals.log.info(
        { status: result.response.status, dur_ms },
        'auth.signout.success'
      );
    } else {
      locals.log.error(
        { kind: result.kind, reason: reasonFor(result), dur_ms },
        'auth.signout.unreachable'
      );
    }

    clearAuthCookies(cookies);

    const locale = locals.locale ?? defaultLocale;
    redirect(303, `/${locale}/sign-in`);
  },
};
