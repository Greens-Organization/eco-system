import { parseSetCookieHeader } from '@pack/auth/cookies';
import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import { authFetch, reasonFor, userMessageFor } from '$lib/auth-proxy';
import { env } from '$lib/env';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, locals, url }) => {
    const t0 = performance.now();
    locals.log.info('auth.signout.attempt');

    const result = await authFetch(`${env.API_URL}/auth/sign-out`, {
      method: 'POST',
      requestId: locals.requestId,
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
        Origin: url.origin,
      },
    });

    const dur_ms = Math.round(performance.now() - t0);

    if (!result.ok) {
      const errors = locals.dictionary.app.errors;
      locals.log.error(
        { kind: result.kind, reason: reasonFor(result), dur_ms },
        'auth.signout.unreachable'
      );
      return fail(503, {
        error: userMessageFor(result.kind, errors),
        requestId: locals.requestId,
      });
    }

    const { response: res } = result;
    locals.log.info({ status: res.status, dur_ms }, 'auth.signout.success');

    for (const raw of res.headers.getSetCookie()) {
      for (const [name, attrs] of parseSetCookieHeader(raw)) {
        cookies.delete(name, { path: attrs.path ?? '/' });
      }
    }

    const locale = locals.locale ?? defaultLocale;
    redirect(303, `/${locale}/sign-in`);
  },
};
