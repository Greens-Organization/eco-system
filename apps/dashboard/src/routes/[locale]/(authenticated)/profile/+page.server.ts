import { fail, type RequestEvent } from '@sveltejs/kit';
import { renderSVG } from 'uqr';
import { localizeAuthError, reasonFor, userMessageFor } from '$lib/auth-proxy';
import { callAuth, errorBody } from '$lib/server/auth-api';
import { forwardSetCookies } from '$lib/server/auth-cookies';
import {
  type ListedSession,
  ListedSessionsSchema,
  timeAgo,
  toDevices,
  tokenFor,
} from '$lib/server/devices';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => ({
  twoFactorEnabled: event.locals.user?.twoFactorEnabled === true,
  devices: await loadDevices(event),
});

/** The user's sessions, tokens included: server-side only. */
async function listSessions(
  event: RequestEvent
): Promise<ListedSession[] | null> {
  const result = await callAuth(event, '/list-sessions');
  const body =
    result.ok && result.response.ok
      ? await result.response.json().catch(() => null)
      : null;
  const parsed = ListedSessionsSchema.safeParse(body);
  if (!parsed.success) {
    event.locals.log.warn(
      { status: result.ok ? result.response.status : result.kind },
      'auth.devices.list_failed'
    );
    return null;
  }
  return parsed.data;
}

async function loadDevices(event: RequestEvent) {
  const sessions = await listSessions(event);
  const currentId = event.locals.session?.id;
  if (!sessions || !currentId) return null;

  const now = new Date();
  return toDevices(sessions, currentId).map((device) => ({
    ...device,
    signedInAgo: timeAgo(device.signedInAt, now, event.locals.locale),
  }));
}

type Step =
  | 'enable'
  | 'confirm'
  | 'disable'
  | 'signOutDevice'
  | 'signOutOthers';

/** Call a better-auth endpoint; on failure, the `fail()` to return. */
async function call(
  event: RequestEvent,
  step: Step,
  path: `/${string}`,
  body: object
) {
  const { locals } = event;
  const errors = locals.dictionary.app.errors;
  const requestId = locals.requestId;

  const result = await callAuth(event, path, body);
  if (!result.ok) {
    locals.log.error(
      { step, kind: result.kind, reason: reasonFor(result) },
      'auth.settings.unreachable'
    );
    return {
      ok: false as const,
      failure: fail(503, {
        step,
        error: userMessageFor(result.kind, errors),
        requestId,
      }),
    };
  }

  const { response: res } = result;
  if (!res.ok) {
    const error = await errorBody(res);
    locals.log.warn(
      { step, status: res.status, code: error.code },
      'auth.settings.rejected'
    );
    return {
      ok: false as const,
      failure: fail(res.status, {
        step,
        error: localizeAuthError(res.status, error, errors),
        requestId,
      }),
    };
  }

  locals.log.info({ step }, 'auth.settings.success');
  return { ok: true as const, response: res };
}

const field = async (request: Request, name: string) => {
  const value = (await request.formData()).get(name);
  return typeof value === 'string' ? value.trim() : '';
};

export const actions: Actions = {
  /** Start enrollment: a new secret and backup codes, not active yet. */
  enable: async (event) => {
    const password = await field(event.request, 'password');
    if (!password) {
      return fail(400, {
        step: 'enable' as const,
        error: event.locals.dictionary.app.errors.missingFields,
      });
    }

    const result = await call(event, 'enable', '/two-factor/enable', {
      password,
    });
    if (!result.ok) return result.failure;

    const { totpURI, backupCodes } = (await result.response.json()) as {
      totpURI: string;
      backupCodes: string[];
    };
    return {
      step: 'enable' as const,
      setup: {
        qr: renderSVG(totpURI),
        secret: new URL(totpURI).searchParams.get('secret') ?? '',
        backupCodes,
      },
    };
  },

  /** Finish enrollment with a code from the app; this turns 2FA on. */
  confirm: async (event) => {
    const code = (await field(event.request, 'code')).replace(/\s+/g, '');
    if (!code) {
      return fail(400, {
        step: 'confirm' as const,
        error: event.locals.dictionary.app.errors.missingFields,
      });
    }

    const result = await call(event, 'confirm', '/two-factor/verify-totp', {
      code,
    });
    if (!result.ok) return result.failure;

    // better-auth replaces the session when 2FA changes; the old one is gone.
    forwardSetCookies(event.cookies, result.response.headers.getSetCookie());
    return { step: 'confirm' as const, done: true };
  },

  disable: async (event) => {
    const password = await field(event.request, 'password');
    if (!password) {
      return fail(400, {
        step: 'disable' as const,
        error: event.locals.dictionary.app.errors.missingFields,
      });
    }

    const result = await call(event, 'disable', '/two-factor/disable', {
      password,
    });
    if (!result.ok) return result.failure;

    forwardSetCookies(event.cookies, result.response.headers.getSetCookie());
    return { step: 'disable' as const, done: true };
  },

  /** Sign out one of the user's other devices. */
  signOutDevice: async (event) => {
    const errors = event.locals.dictionary.app.errors;
    const id = await field(event.request, 'id');
    const sessions = await listSessions(event);
    if (!sessions) {
      return fail(503, {
        step: 'signOutDevice' as const,
        error: errors.unreachable,
      });
    }

    // The id comes from the form; only the user's own list can turn it into
    // a token, and the current session is not offered.
    const target = tokenFor(sessions, id, event.locals.session?.id ?? '');
    if (target.kind !== 'found') {
      return fail(404, {
        step: 'signOutDevice' as const,
        error: errors.deviceNotFound,
      });
    }

    const result = await call(event, 'signOutDevice', '/revoke-session', {
      token: target.token,
    });
    if (!result.ok) return result.failure;
    return { step: 'signOutDevice' as const, done: true };
  },

  signOutOthers: async (event) => {
    const result = await call(
      event,
      'signOutOthers',
      '/revoke-other-sessions',
      {}
    );
    if (!result.ok) return result.failure;
    return { step: 'signOutOthers' as const, done: true };
  },
};
