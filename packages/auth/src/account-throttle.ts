import type { CacheNamespace } from '@pack/cache';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';

/**
 * Per-account brute-force limit for the password step (NIST 800-63B §3.2.2).
 * The IP rate limiter cannot see a botnet spreading guesses for one account
 * across many addresses; this counts failures per email, from any address.
 *
 * It slows the account down instead of locking it: a hard lock would let
 * anyone keep the owner out by typing wrong passwords on purpose. The answer
 * while slowed down is the rate limiter's own 429, and unknown emails are
 * counted the same way, so it reveals nothing about which accounts exist.
 */
export const ACCOUNT_THROTTLE = {
  /** Wrong passwords allowed before any wait. */
  freeAttempts: 5,
  /** The wait doubles per extra failure, up to this. 20 min keeps a full
   * day of guessing under NIST's 100 failures per account. */
  maxWaitSeconds: 20 * 60,
  /** Failures are forgotten this long after the first one (or on success). */
  windowSeconds: 24 * 60 * 60,
} as const;

/** Seconds the account must wait after its `failures`-th wrong password. */
export function waitAfter(failures: number): number {
  const extra = failures - ACCOUNT_THROTTLE.freeAttempts;
  if (extra <= 0) return 0;
  return Math.min(2 ** extra, ACCOUNT_THROTTLE.maxWaitSeconds);
}

/** Redis never sees the email itself, only a hash of its normalized form. */
async function accountId(email: string): Promise<string> {
  const normalized = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', normalized);
  return Buffer.from(digest).toString('hex');
}

const SIGN_IN = '/sign-in/email';

export function accountThrottle(store: CacheNamespace): BetterAuthPlugin {
  const keys = (id: string) => ({
    failures: `login-failures:${id}`,
    wait: `login-wait:${id}`,
  });
  const emailOf = (body: unknown) =>
    typeof body === 'object' &&
    body !== null &&
    'email' in body &&
    typeof body.email === 'string'
      ? body.email
      : null;

  return {
    id: 'account-throttle',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === SIGN_IN,
          handler: createAuthMiddleware(async (ctx) => {
            const email = emailOf(ctx.body);
            if (!email) return;

            const retryAfter = await store.ttl(
              keys(await accountId(email)).wait
            );
            if (retryAfter > 0) {
              throw new APIError(
                'TOO_MANY_REQUESTS',
                { message: 'Too many requests. Please try again later.' },
                { 'X-Retry-After': String(retryAfter) }
              );
            }
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => ctx.path === SIGN_IN,
          handler: createAuthMiddleware(async (ctx) => {
            const email = emailOf(ctx.body);
            if (!email) return;
            const key = keys(await accountId(email));
            const returned = ctx.context.returned;

            if (!isAPIError(returned)) {
              // The password was right (a 2FA challenge counts): start over.
              await store.del(key.failures);
              await store.del(key.wait);
              return;
            }
            if (returned.body?.code !== 'INVALID_EMAIL_OR_PASSWORD') return;

            const failures = await store.increment(
              key.failures,
              ACCOUNT_THROTTLE.windowSeconds
            );
            const wait = waitAfter(failures);
            if (wait > 0) await store.set(key.wait, '1', wait);
          }),
        },
      ],
    },
  };
}
