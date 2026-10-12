import { describe, expect, test } from 'bun:test';
import { env } from '@pack/db/pack-env';
import { seedAdmin } from '@pack/db/seed/admin';
import { buildTestApp } from '../helpers/app';
import { authHeaders } from '../helpers/auth';

// The seeded admin writes the auth tables directly, bypassing better-auth, so
// only signing in with it proves the rows have the shape better-auth expects.
describe('seeded admin', () => {
  test('can sign in with ADMIN_EMAIL / ADMIN_PASSWORD', async () => {
    await seedAdmin();
    const res = await buildTestApp().request('/auth/sign-in/email', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        email: env.ADMIN_EMAIL ?? 'admin@example.com',
        password: env.ADMIN_PASSWORD ?? 'admin',
      }),
    });
    expect(res.status).toBe(200);
  });
});
