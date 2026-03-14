import { hc } from 'hono/client'
import type { AppType } from '@api/main/routes/v1'
import { env } from '$lib/env'

/**
 * Creates a typed Hono RPC client with cookie forwarding.
 * Call this inside server load functions or hooks, passing the Cookie header.
 *
 * @example
 * // In +page.server.ts
 * export async function load({ request }) {
 *   const api = createApiClient(request.headers.get('cookie') ?? '')
 *   const res = await api.stats.$get()
 *   ...
 * }
 */
export function createApiClient(cookieHeader: string) {
  return hc<AppType>(`${env.API_URL}/v1`, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          Cookie: cookieHeader,
        },
      }),
  })
}
