import { parseSetCookieHeader, toCookieOptions } from '@pack/auth/cookies';
import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$lib/env';
import {
  authFetch,
  reasonFor,
  redactEmail,
  userMessageFor,
} from '$lib/auth-proxy';
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
      return fail(400, {
        error: 'Email and password are required',
        requestId: locals.requestId,
      });
    }

    const { domain, localHint } = redactEmail(email);
    const t0 = performance.now();
    locals.log.info({ domain, localHint }, 'auth.signin.attempt');

    const result = await authFetch(`${env.API_URL}/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
        Origin: url.origin,
      },
      body: JSON.stringify({ email, password }),
    });

    const dur_ms = Math.round(performance.now() - t0);

    if (!result.ok) {
      locals.log.error(
        { kind: result.kind, reason: reasonFor(result), dur_ms },
        'auth.signin.unreachable'
      );
      return fail(503, {
        error: userMessageFor(result.kind),
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
        error: body.message ?? 'Sign in failed',
        requestId: locals.requestId,
      });
    }

    locals.log.info({ status: res.status, dur_ms }, 'auth.signin.success');

    // Forward Set-Cookie headers from the API. `encode: v => v` is critical:
    // SvelteKit's default `encodeURIComponent` would re-encode better-auth's
    // base64 payload, breaking the HMAC verification on subsequent requests.
    for (const raw of res.headers.getSetCookie()) {
      for (const [name, attrs] of parseSetCookieHeader(raw)) {
        cookies.set(name, attrs.value, {
          ...toCookieOptions(attrs),
          encode: (v) => v,
          path: attrs.path ?? '/',
        });
      }
    }

    const locale = locals.locale ?? defaultLocale;
    redirect(303, `/${locale}`);
  },
};
