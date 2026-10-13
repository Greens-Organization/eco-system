import type { AppType } from '@api/main/routes/v1';
import type { Cookies } from '@sveltejs/kit';
import { hc } from 'hono/client';
import { env } from '$lib/env';
import { cookieHeader } from '$lib/server/cookie-header';

/**
 * Creates a typed Hono RPC client with cookie + requestId forwarding.
 * Call this inside server load functions, passing `event.cookies` (not the
 * request's Cookie header: an action may have replaced the session in this
 * same request) and the per-request id so logs on the API side share the
 * same correlation id as the dashboard's `logHandle`.
 *
 * @example
 *   const api = createApiClient(cookies, locals.requestId);
 *   const res = await api.stats.$get();
 */
export function createApiClient(cookies: Cookies, requestId?: string) {
  return hc<AppType>(`${env.API_URL}/v1`, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('Cookie', cookieHeader(cookies));
      if (requestId) headers.set('x-request-id', requestId);
      return fetch(input, { ...init, headers });
    },
  });
}
