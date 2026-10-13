import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/**
 * Deleting the account must always ask for the password. better-auth skips
 * it while the session is "fresh" (`session.freshAge`, a day by default),
 * and with our 24 h sessions every session is fresh — so a stolen session
 * cookie alone could delete the account.
 */
export function requirePasswordToDeleteUser(): BetterAuthPlugin {
  return {
    id: 'require-password-to-delete-user',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/delete-user',
          handler: createAuthMiddleware(async (ctx) => {
            const password = (ctx.body as { password?: unknown } | undefined)
              ?.password;
            if (typeof password !== 'string' || password.length === 0) {
              throw new APIError('BAD_REQUEST', {
                message: 'Password is required to delete the account',
                code: 'PASSWORD_REQUIRED',
              });
            }
          }),
        },
      ],
    },
  };
}
