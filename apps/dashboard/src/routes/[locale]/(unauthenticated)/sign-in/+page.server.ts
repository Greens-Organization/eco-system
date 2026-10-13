import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import {
  localizeAuthError,
  reasonFor,
  redactEmail,
  userMessageFor,
} from '#lib/auth-proxy.js';
import { callAuth } from '#lib/server/auth-api.js';
import { forwardSetCookies } from '#lib/server/auth-cookies.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    redirect(307, `/${locals.locale ?? defaultLocale}`);
  }
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals, cookies } = event;
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    const errors = locals.dictionary.app.errors;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email ||
      !password
    ) {
      return fail(400, {
        error: errors.missingFields,
        requestId: locals.requestId,
      });
    }

    const { domain, localHint } = redactEmail(email);
    const t0 = performance.now();
    locals.log.info({ domain, localHint }, 'auth.signin.attempt');

    // The session opens here, so it carries this browser's user agent and IP.
    const result = await callAuth(event, '/sign-in/email', { email, password });

    const dur_ms = Math.round(performance.now() - t0);

    if (!result.ok) {
      locals.log.error(
        { kind: result.kind, reason: reasonFor(result), dur_ms },
        'auth.signin.unreachable'
      );
      return fail(503, {
        error: userMessageFor(result.kind, errors),
        requestId: locals.requestId,
      });
    }

    const { response: res } = result;

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
      };
      locals.log.warn(
        { status: res.status, dur_ms, code: body.code },
        'auth.signin.rejected'
      );
      return fail(res.status, {
        error: localizeAuthError(res.status, body, errors),
        requestId: locals.requestId,
      });
    }

    // For a 2FA account the password only opens a challenge: the response
    // carries a short-lived `two_factor` cookie and no session.
    const body: unknown = await res.json().catch(() => null);
    const needsSecondFactor =
      typeof body === 'object' &&
      body !== null &&
      'twoFactorRedirect' in body &&
      body.twoFactorRedirect === true;

    locals.log.info(
      { status: res.status, dur_ms, twoFactor: needsSecondFactor },
      'auth.signin.success'
    );

    forwardSetCookies(cookies, res.headers.getSetCookie());

    const locale = locals.locale ?? defaultLocale;
    redirect(
      303,
      needsSecondFactor ? `/${locale}/sign-in/two-factor` : `/${locale}`
    );
  },
};
