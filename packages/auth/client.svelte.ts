import { createAuthClient } from 'better-auth/svelte'

/**
 * Better Auth client for SvelteKit.
 * Uses `better-auth/svelte` which provides reactive Svelte stores.
 *
 * Auth requests go to `/auth/*` which is transparently proxied
 * to the Hono API via hooks.server.ts (same pattern as Next.js proxy.ts).
 */
export const authClient = createAuthClient({
  basePath: '/auth',
  fetchOptions: {
    onError(e) {
      if (e.error.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/sign-in'
      }
    },
  },
})

export type Session = typeof authClient.$Infer.Session
export type User = typeof authClient.$Infer.Session.user
