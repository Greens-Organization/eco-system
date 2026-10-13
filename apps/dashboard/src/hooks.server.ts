import {
  defaultLocale,
  getDictionary,
  isValidLocale,
  resolveLocale,
} from '@pack/i18n';
import { log } from '@pack/observability/logger';
import { captureError } from '@pack/observability/sentry';
import { error, redirect } from '@sveltejs/kit';
import {
  type Handle,
  type HandleServerError,
  sequence,
} from '@sveltejs/kit/hooks';
import { authFetch } from '#lib/auth-proxy.js';
import { env } from '#lib/env.js';
import {
  clearAuthCookies,
  forwardSetCookies,
} from '#lib/server/auth-cookies.js';
import {
  injectCspNonce,
  SECURITY_HEADERS,
} from '#lib/server/security-headers.js';
import { resolveSession } from '#lib/server/session.js';

const unauthenticatedPaths = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
];

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

/**
 * Outermost: security headers on every response (Kit sets the CSP itself),
 * and the CSP nonce swapped into server-rendered markup that needs it.
 */
const securityHandle: Handle = async ({ event, resolve }) => {
  const response = await injectCspNonce(await resolve(event));
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    // A page may tighten one (the reset page: no Referer at all).
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  return response;
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

  // Redirect to locale-prefixed URL if missing, keeping the query string.
  if (!isValidLocale(segment) && pathname !== '/') {
    redirect(307, `/${locale}${pathname}${event.url.search}`);
  }

  // app.html ships lang="en"; swap in the page's language so screen readers
  // and the browser's translate prompt get it right.
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('<html lang="en">', `<html lang="${locale}">`),
  });
};

/**
 * Resolve the session and guard protected routes.
 *
 * Fast path: the signed cookie cache (`session_data`, 60 s) is validated
 * locally, with no network hop. When it is stale but a session token is
 * present, the API revalidates the session and its fresh cookie cache is
 * forwarded to the browser, so only one request per minute pays the hop.
 * A token the API rejects is cleared. An unreachable API fails protected
 * routes with 503 instead of pretending the user is signed out.
 */
const sessionHandle: Handle = async ({ event, resolve }) => {
  const resolved = await resolveSession(event.request, {
    secret: env.BETTER_AUTH_SECRET,
    fetchSession: (cookie) =>
      authFetch(`${env.API_URL}/auth/get-session`, {
        headers: { cookie },
        requestId: event.locals.requestId,
        clientIp: event.getClientAddress(),
        clientIpSecret: env.CLIENT_IP_SECRET,
      }),
  });

  event.locals.session = null;
  event.locals.user = null;

  switch (resolved.kind) {
    case 'refreshed':
      forwardSetCookies(event.cookies, resolved.setCookie);
      event.locals.session = resolved.session;
      event.locals.user = resolved.user;
      break;
    case 'cached':
      event.locals.session = resolved.session;
      event.locals.user = resolved.user;
      break;
    case 'anonymous':
      if (resolved.staleCookies) clearAuthCookies(event.cookies);
      break;
    case 'unavailable':
      event.locals.log.error(
        { reason: resolved.reason },
        'auth.session.unavailable'
      );
      if (isProtectedPath(event.url.pathname)) {
        error(503, 'Authentication service unavailable');
      }
      break;
  }

  if (isProtectedPath(event.url.pathname) && !event.locals.session) {
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
  securityHandle,
  logHandle,
  localeHandle,
  sessionHandle,
  i18nHandle
);

/**
 * Every error thrown while responding, except redirects (Kit 3 passes
 * expected ones too). Stamps each with an `errorId` so the UI
 * (+error.svelte) can show it and the user can quote it back.
 *
 * - `unknown` (a bug, or something our code calls threw): full `err` in the
 *   log and Sentry; the user sees Kit's generic 500 message.
 * - `framework` (Kit's own, e.g. a 404 from a typo): one warn line.
 * - `app` / `validation` (`error(...)` from our code): whoever threw it
 *   already logged why, so nothing more here.
 */
export const handleError: HandleServerError = ({ kind, error, event }) => {
  const errorId = crypto.randomUUID();
  const requestLog = event.locals.log ?? log;

  if (kind === 'unknown') {
    requestLog.error({ err: error, status: 500, errorId }, 'unhandled');
    // No-op without SENTRY_DSN. The errorId is what the user quotes back.
    captureError(error, {
      support_id: errorId,
      classification: 'technical_error',
      route: event.route.id,
      method: event.request.method,
      status_code: 500,
    });
  } else if (kind === 'framework') {
    requestLog.warn({ status: error.status, errorId }, error.message);
  }

  return { errorId };
};
