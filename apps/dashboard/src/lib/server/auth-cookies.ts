import { parseSetCookieHeader, toCookieOptions } from '@pack/auth/cookies';
import type { Cookies } from '@sveltejs/kit';

// better-auth prefixes its cookies with `__Secure-` when served over https.
const AUTH_COOKIE = /^(__Secure-)?better-auth\./;

export const isAuthCookie = (name: string): boolean => AUTH_COOKIE.test(name);

/**
 * Forward the API's `Set-Cookie` headers to the browser. `encode: v => v` is
 * critical: SvelteKit's default `encodeURIComponent` would re-encode
 * better-auth's base64 payload and break its HMAC check on the next request.
 */
export function forwardSetCookies(cookies: Cookies, setCookie: string[]): void {
  for (const raw of setCookie) {
    for (const [name, attrs] of parseSetCookieHeader(raw)) {
      cookies.set(name, attrs.value, {
        ...toCookieOptions(attrs),
        encode: (v) => v,
        path: attrs.path ?? '/',
      });
    }
  }
}

/** Drop every better-auth cookie the browser sent. */
export function clearAuthCookies(cookies: Cookies): void {
  for (const { name } of cookies.getAll()) {
    if (isAuthCookie(name)) cookies.delete(name, { path: '/' });
  }
}
