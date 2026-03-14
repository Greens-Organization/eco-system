import { db } from '@pack/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { argon2Adapter } from './crypto';
import { packEnv } from './pack-env';

const _env = packEnv();

export const auth = betterAuth({
  basePath: '/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  plugins: [nextCookies()],
  trustedOrigins: _env.ORIGIN_ALLOWED,

  session: { cookieCache: { enabled: true, maxAge: 60 * 5 } },

  emailAndPassword: {
    enabled: true,
    password: {
      hash: argon2Adapter.hash,
      verify: argon2Adapter.compare,
    },
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
});
