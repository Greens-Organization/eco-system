import { getCookieCache, getSessionCookie } from '@pack/auth/cookies';
import {
  defaultLocale,
  getDictionary,
  isValidLocale,
  resolveLocale,
} from '@pack/i18n';
import { log } from '@pack/observability/logger';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$lib/env';

const unauthenticatedPaths = ['/sign-in', '/sign-up'];

function isProtectedPath(pathname: string): boolean {
  // Strip locale prefix before checking
  const segments = pathname.split('/');
  const withoutLocale =
    segments.length > 1 && isValidLocale(segments[1] ?? '')
      ? `/${segments.slice(2).join('/')}`
      : pathname;

  return !unauthenticatedPaths.some((p) => withoutLocale.startsWith(p));
}

/**
 * Per-request observability:
 *  - generates a short requestId, exposes via `locals.requestId` and the
 *    `x-request-id` response header
 *  - puts a child pino logger in `locals.log` so every load/action shares
 *    the same correlation id (requestId + path inlined by pino-pretty)
 *  - logs ONE line per request with method, status, and duration
 */
const logHandle: Handle = async ({ event, resolve }) => {
  // Short, copy-pasteable id. Collisions are fine — only used for
  // correlation within a single dev session.
  const requestId = crypto.randomUUID().slice(0, 8);
  const reqLog = log.child({ requestId, path: event.url.pathname });

  event.locals.requestId = requestId;
  event.locals.log = reqLog;

  const t0 = performance.now();
  const response = await resolve(event);
  const dur = Math.round(performance.now() - t0);

  reqLog.info(`${event.request.method} ${response.status} ${dur}ms`);
  response.headers.set('x-request-id', requestId);
  return response;
};

/** Proxy /auth/* requests transparently to the Hono API */
const authHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (pathname.startsWith('/auth')) {
    const target = `${env.API_URL}${pathname}${event.url.search}`;
    // Forward the per-request id so the API logs share our correlation
    // chain (same id appears in dashboard logHandle output and Hono's
    // requestLogger output).
    const headers = new Headers(event.request.headers);
    if (event.locals.requestId) {
      headers.set('x-request-id', event.locals.requestId);
    }
    return fetch(target, {
      method: event.request.method,
      headers,
      body: ['GET', 'HEAD'].includes(event.request.method)
        ? undefined
        : event.request.body,
      // @ts-expect-error — duplex required for streaming bodies
      duplex: 'half',
    });
  }

  return resolve(event);
};

/** Detect locale from URL segment or Accept-Language header */
const localeHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const segments = pathname.split('/');
  const segment = segments[1] ?? '';

  const locale = isValidLocale(segment)
    ? segment
    : resolveLocale(event.request.headers.get('accept-language'));

  event.locals.locale = locale;

  // Redirect to locale-prefixed URL if missing
  if (!isValidLocale(segment) && pathname !== '/') {
    redirect(307, `/${locale}${pathname}`);
  }

  return resolve(event);
};

/**
 * Guard protected routes.
 *
 * Fast path: `getCookieCache` validates the HMAC-signed session data cookie
 * locally (no DB hop). When fresh, populates `locals.session` and
 * `locals.user` with real data — load functions can use them directly.
 *
 * Fallback: cookie cache stale or missing. We still trust the presence of
 * `session_token` to keep the request flowing; downstream API calls will
 * re-validate against the api server (which itself hits the DB on cache
 * miss) and refresh the cookie cache as a side-effect.
 *
 * No cookie at all → redirect to sign-in.
 */
const sessionHandle: Handle = async ({ event, resolve }) => {
  const cached = await getCookieCache(event.request, {
    secret: env.BETTER_AUTH_SECRET,
  });

  if (cached) {
    event.locals.session = cached.session;
    event.locals.user = cached.user;
  } else {
    event.locals.session = null;
    event.locals.user = null;
  }

  const authenticated =
    cached !== null || getSessionCookie(event.request) !== null;

  if (isProtectedPath(event.url.pathname) && !authenticated) {
    const locale = event.locals.locale ?? defaultLocale;
    redirect(307, `/${locale}/sign-in`);
  }

  return resolve(event);
};

/** Load dictionary for current locale into locals */
const i18nHandle: Handle = async ({ event, resolve }) => {
  event.locals.dictionary = await getDictionary(event.locals.locale);
  return resolve(event);
};

export const handle = sequence(
  logHandle,
  authHandle,
  localeHandle,
  sessionHandle,
  i18nHandle
);

/**
 * Catch unhandled errors from load functions, form actions, and the
 * resolve chain. Stamps each with an `errorId` so the UI (+error.svelte)
 * can show it and the user can quote it back when filing a bug.
 */
export const handleError: HandleServerError = ({
  error,
  event,
  status,
  message,
}) => {
  const errorId = crypto.randomUUID();
  const requestLog = event.locals.log ?? log;

  // 4xx are user-driven and expected (404 from typos, 401 from
  // expired sessions, 403 from missing permissions). Logging the
  // full stack drowns real 5xx bugs in noise — emit a single warn
  // line with status + correlation id and let the rest stay quiet.
  // Genuine 5xx exceptions still get the full `err` serializer
  // (stack, cause, name) so we have what we need to debug.
  if (status >= 400 && status < 500) {
    requestLog.warn({ status, errorId }, message);
  } else {
    requestLog.error({ err: error, status, errorId }, message);
  }

  return { message, errorId };
};
