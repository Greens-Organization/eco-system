import { getSessionCookie } from '@pack/auth/cookies';
import {
  defaultLocale,
  getDictionary,
  isValidLocale,
  resolveLocale,
} from '@pack/i18n';
import type { Handle } from '@sveltejs/kit';
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

/** Proxy /auth/* requests transparently to the Hono API */
const authHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (pathname.startsWith('/auth')) {
    const target = `${env.API_URL}${pathname}${event.url.search}`;
    return fetch(target, {
      method: event.request.method,
      headers: event.request.headers,
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

/** Guard protected routes — redirect to sign-in if no session */
const sessionHandle: Handle = async ({ event, resolve }) => {
  const sessionCookie = getSessionCookie(event.request);
  event.locals.session = sessionCookie ?? null;

  const { pathname } = event.url;

  if (isProtectedPath(pathname) && !sessionCookie) {
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
  authHandle,
  localeHandle,
  sessionHandle,
  i18nHandle
);
