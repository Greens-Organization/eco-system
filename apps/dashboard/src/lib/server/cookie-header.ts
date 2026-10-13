import type { Cookies } from '@sveltejs/kit';

/**
 * The Cookie header to send the API, built from `event.cookies` rather than
 * the incoming request: when an action replaced the session (password
 * change, 2FA on/off), the load that runs next in the same request must
 * already use the new cookies — the old session is revoked, and sending it
 * gets the user signed out. Values are kept as stored (no decoding), the
 * same bytes the browser would send.
 */
export function cookieHeader(cookies: Cookies): string {
  return cookies
    .getAll({ decode: (value) => value })
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}
