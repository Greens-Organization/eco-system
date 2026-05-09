import type { AppType } from '@api/main/routes/v1';
import { hc } from 'hono/client';
import { env } from '$lib/env';

/**
 * Creates a typed Hono RPC client with cookie + requestId forwarding.
 * Call this inside server load functions or hooks, passing the Cookie
 * header and the per-request id so logs on the API side share the same
 * correlation id as the dashboard's `logHandle`.
 *
 * @example
 *   const api = createApiClient(
 *     request.headers.get('cookie') ?? '',
 *     locals.requestId
 *   );
 *   const res = await api.stats.$get();
 */
export function createApiClient(cookieHeader: string, requestId?: string) {
  return hc<AppType>(`${env.API_URL}/v1`, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('Cookie', cookieHeader);
      if (requestId) headers.set('x-request-id', requestId);
      return fetch(input, { ...init, headers });
    },
  });
}
