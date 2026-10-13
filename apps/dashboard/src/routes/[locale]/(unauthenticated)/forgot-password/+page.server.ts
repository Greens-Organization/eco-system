import { defaultLocale } from '@pack/i18n';
import { fail, redirect } from '@sveltejs/kit';
import { reasonFor, redactEmail, userMessageFor } from '$lib/auth-proxy';
import { callAuth } from '$lib/server/auth-api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) redirect(307, `/${locals.locale ?? defaultLocale}`);
};

export const actions: Actions = {
  default: async (event) => {
    const { request, locals, url } = event;
    const errors = locals.dictionary.app.errors;
    const email = (await request.formData()).get('email');
    if (typeof email !== 'string' || !email.trim()) {
      return fail(400, {
        error: errors.missingFields,
        requestId: locals.requestId,
      });
    }

    locals.log.info(redactEmail(email), 'auth.reset.requested');
    const result = await callAuth(event, '/request-password-reset', {
      email: email.trim(),
      // The link in the mail lands on this dashboard, in this language.
      redirectTo: `${url.origin}/${locals.locale}/reset-password`,
    });

    if (!result.ok) {
      locals.log.error(
        { kind: result.kind, reason: reasonFor(result) },
        'auth.reset.unreachable'
      );
      return fail(503, {
        error: userMessageFor(result.kind, errors),
        requestId: locals.requestId,
      });
    }
    if (result.response.status === 429) {
      return fail(429, {
        error: errors.tooManyRequests,
        requestId: locals.requestId,
      });
    }
    // The same answer whether the account exists or not.
    return { sent: true };
  },
};
