import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import { reasonFor, userMessageFor } from '#lib/auth-proxy.js';
import { callAuth, errorBody } from '#lib/server/auth-api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
  if (locals.session) redirect(307, `/${locals.locale ?? defaultLocale}`);
  // The token is in this URL: never leak it to another site via Referer.
  setHeaders({ 'referrer-policy': 'no-referrer' });
  return { token: url.searchParams.get('token') ?? '' };
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals } = event;
    const t = locals.dictionary.app;
    const form = await request.formData();
    const token = form.get('token');
    const newPassword = form.get('newPassword');
    const confirm = form.get('confirmPassword');

    if (typeof token !== 'string' || !token) {
      return fail(400, { error: t.auth.reset.invalidLink, invalidLink: true });
    }
    if (
      typeof newPassword !== 'string' ||
      !newPassword ||
      typeof confirm !== 'string'
    ) {
      return fail(400, { error: t.errors.missingFields });
    }
    if (newPassword !== confirm) {
      return fail(400, { error: t.auth.reset.mismatch });
    }

    const result = await callAuth(event, '/reset-password', {
      newPassword,
      token,
    });
    if (!result.ok) {
      locals.log.error('auth.reset.unreachable', {
        kind: result.kind,
        reason: reasonFor(result),
      });
      return fail(503, { error: userMessageFor(result.kind, t.errors) });
    }
    if (!result.response.ok) {
      const body = await errorBody(result.response);
      locals.log.warn('auth.reset.rejected', {
        status: result.response.status,
        code: body.code,
      });
      if (body.code === 'INVALID_TOKEN') {
        return fail(400, {
          error: t.auth.reset.invalidLink,
          invalidLink: true,
        });
      }
      if (body.code === 'PASSWORD_TOO_SHORT') {
        return fail(400, { error: t.errors.passwordTooShort });
      }
      return fail(result.response.status, { error: t.errors.unknown });
    }

    locals.log.info('auth.reset.done');
    redirect(303, `/${locals.locale}/sign-in?reset=1`);
  },
};
