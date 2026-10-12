import { getCookieCache } from 'better-auth/cookies';

/**
 * Cookie settings the API (`server.ts`) and the dashboard must agree on. The
 * dashboard verifies the cookie cache locally, so a mismatch here makes every
 * request miss the cache. No env access: the dashboard imports this module.
 */
export const AUTH_COOKIE = {
  prefix: 'better-auth',
  strategy: 'compact',
  /** Bump to invalidate every cookie cache at once (e.g. after an incident). */
  version: '1',
  cacheMaxAge: 60,
} as const;

/**
 * Read the signed cookie cache. `secure` must match how the API named the
 * cookie: it adds `__Secure-` when `BETTER_AUTH_URL` is https, which is the
 * dashboard's own public origin.
 */
export function readSessionCache(
  request: Request | Headers,
  { secret, secure }: { secret: string; secure: boolean }
) {
  return getCookieCache(request, {
    secret,
    isSecure: secure,
    cookiePrefix: AUTH_COOKIE.prefix,
    strategy: AUTH_COOKIE.strategy,
    version: AUTH_COOKIE.version,
  });
}

export {
  getSessionCookie,
  parseSetCookieHeader,
  toCookieOptions,
} from 'better-auth/cookies';
