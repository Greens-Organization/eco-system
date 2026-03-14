import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/auth',
  /**
   * Global error handling for auth requests.
   *
   * - 401 (Unauthorized): Occurs when accessing protected resources without a valid session.
   *   The `authMiddleware` in the API explicitly throws this when `getSession` returns null.
   *
   */
  fetchOptions: {
    onError(e) {
      if (e.error.status === 401) {
        window.location.href = '/sign-in';
      }
    },
  },
});
