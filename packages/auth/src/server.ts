import { createNamespace } from '@pack/cache';
import { db } from '@pack/db';
import { sendEmailHtml } from '@pack/email';
import { log } from '@pack/observability/logger';
import { argon2Adapter } from '@pack/tools';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { env } from '../pack-env';
import { accountThrottle } from './account-throttle';
import { CLIENT_IP_HEADER } from './client-ip';
import { AUTH_COOKIE } from './cookies';
import { resetEmail, resetLink } from './emails/reset-password';
import { requirePasswordToDeleteUser } from './require-password';

const store = createNamespace('auth');

/** Where the browser is: the dashboard's public origin and the allowed ones. */
const trustedOrigins = [
  new URL(env.BETTER_AUTH_URL).origin,
  ...env.ORIGIN_ALLOWED.map((origin) => new URL(origin).origin),
];

/** Name shown next to the account in the authenticator app. */
const TOTP_ISSUER = 'eco-system';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  // The dashboard's public URL: the browser only ever sees the dashboard, and
  // an https URL here is what turns on `Secure` and the `__Secure-` prefix.
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Multi-step writes (a password reset spends the token, revokes the
    // sessions and sets the password) commit together or not at all.
    transaction: true,
  }),
  trustedOrigins: env.ORIGIN_ALLOWED,

  // Sessions and rate-limit counters, all under `auth:` and all with a TTL.
  secondaryStorage: {
    get: store.get,
    set: store.set,
    delete: store.del,
    getAndDelete: store.getAndDelete,
    increment: store.increment,
  },

  session: {
    // Absolute lifetime: 24 h from sign-in, never extended by activity.
    expiresIn: 60 * 60 * 24,
    disableSessionRefresh: true,
    // Redis serves the lookups; Postgres keeps the record.
    storeSessionInDatabase: true,
    // A revoked session keeps working in the dashboard until this expires.
    cookieCache: {
      enabled: true,
      maxAge: AUTH_COOKIE.cacheMaxAge,
      strategy: AUTH_COOKIE.strategy,
      version: AUTH_COOKIE.version,
    },
  },

  // On in every environment, so dev and e2e run what production runs. Keyed
  // by the client IP that the dashboard forwards, shared through Redis.
  rateLimit: { enabled: true, storage: 'secondary-storage' },

  // Profile → danger zone. Always with the password (plugin below).
  user: { deleteUser: { enabled: true } },

  emailAndPassword: {
    enabled: true,
    password: {
      hash: argon2Adapter.hash,
      verify: argon2Adapter.compare,
    },
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    // better-auth answers the same way for unknown emails; this keeps the
    // timing the same too. Not awaited: SMTP latency would reveal that the
    // account exists. The link expires in 1 h and works once.
    sendResetPassword: async ({ user, url, token }) => {
      const link = resetLink(url, token);
      // better-auth already rejects an untrusted redirectTo; a mailed token
      // to a foreign site is an account takeover, so check again here.
      if (!link || !trustedOrigins.includes(link.origin)) {
        log.warn({ origin: link?.origin }, 'auth.reset.untrusted_link');
        return;
      }
      const { subject, html } = resetEmail(link);
      if (!env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
        // Local development without SMTP: the link has to go somewhere.
        log.info({ link: link.toString() }, 'auth.reset.link (dev only)');
      }
      void sendEmailHtml({ to: user.email, subject, html }).catch((error) =>
        log.error({ err: error }, 'auth.reset.send_failed')
      );
    },
    // Without a session to hand out, a duplicate email gets the same answer
    // as a new one, so sign-up does not reveal who is registered.
    autoSignIn: false,
  },
  plugins: [
    // Optional TOTP, enabled per user in Settings (owner decision 2026-10-12).
    // `/two-factor/*` is limited to 3 requests / 10 s per client, and repeated
    // bad codes lock the account's 2FA for a while.
    twoFactor({ issuer: TOTP_ISSUER }),
    // The password step's per-account limit, on top of the per-IP one.
    accountThrottle(store),
    requirePasswordToDeleteUser(),
  ],

  advanced: {
    // better-auth turns the Origin/redirect checks off under NODE_ENV=test;
    // keep them on so the e2e suite runs what production runs.
    disableOriginCheck: false,
    cookiePrefix: AUTH_COOKIE.prefix,
    defaultCookieAttributes: { sameSite: 'strict' },
    // Only ever set by the dashboard and signed (`client-ip.ts`); the API's
    // `/auth` route drops it unless the signature checks out.
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    database: {
      generateId: false,
    },
  },
});
