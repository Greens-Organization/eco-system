import { defaultLocale } from '@pack/i18n';
import { fail, type RequestEvent, redirect } from '@sveltejs/kit';
import {
  localizeAuthError,
  reasonFor,
  userMessageFor,
} from '#lib/auth-proxy.js';
import { callAuth, errorBody } from '#lib/server/auth-api.js';
import { forwardSetCookies } from '#lib/server/auth-cookies.js';
import type { Actions, PageServerLoad } from './$types';

// Set by the API when a password sign-in needs a second factor (~10 min).
const PENDING_COOKIE = /^(__Secure-)?better-auth\.two_factor$/;

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const locale = locals.locale ?? defaultLocale;
  if (locals.session) redirect(307, `/${locale}`);

  const pending = cookies
    .getAll()
    .some(({ name }) => PENDING_COOKIE.test(name));
  if (!pending) redirect(307, `/${locale}/sign-in`);
};

type Method = 'totp' | 'backup';

const ENDPOINT = {
  totp: '/two-factor/verify-totp',
  backup: '/two-factor/verify-backup-code',
} as const;

async function verify(event: RequestEvent, method: Method) {
  const { request, locals, cookies } = event;
  const errors = locals.dictionary.app.errors;
  const requestId = locals.requestId;

  const code = (await request.formData()).get('code');
  if (typeof code !== 'string' || !code.trim()) {
    return fail(400, { method, error: errors.missingFields, requestId });
  }

  const t0 = performance.now();
  const result = await callAuth(event, ENDPOINT[method], {
    code: code.replace(/\s+/g, ''),
  });
  const dur_ms = Math.round(performance.now() - t0);

  if (!result.ok) {
    locals.log.error(
      { method, kind: result.kind, reason: reasonFor(result), dur_ms },
      'auth.2fa.unreachable'
    );
    return fail(503, {
      method,
      error: userMessageFor(result.kind, errors),
      requestId,
    });
  }

  const { response: res } = result;
  if (!res.ok) {
    const body = await errorBody(res);
    locals.log.warn(
      { method, status: res.status, code: body.code, dur_ms },
      'auth.2fa.rejected'
    );
    return fail(res.status, {
      method,
      error: localizeAuthError(res.status, body, errors),
      requestId,
    });
  }

  locals.log.info({ method, dur_ms }, 'auth.2fa.success');
  forwardSetCookies(cookies, res.headers.getSetCookie());
  redirect(303, `/${locals.locale ?? defaultLocale}`);
}

export const actions: Actions = {
  totp: (event) => verify(event, 'totp'),
  backup: (event) => verify(event, 'backup'),
};
