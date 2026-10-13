import { describe, expect, test } from 'bun:test';
import { db } from '@pack/db';
import { user } from '@pack/db/schema';
import { seedAdmin } from '@pack/db/seed/admin';
import { eq } from 'drizzle-orm';
import { buildTestApp } from '../helpers/app';
import { authHeaders } from '../helpers/auth';

// The seed writes better-auth's tables directly, so only signing in with
// what it created proves the rows have the shape better-auth expects.

const admin = {
  email: 'Seed.Admin@E2E.test',
  password: 'seed-admin-password',
  name: 'Seed Admin',
};

const signIn = (email: string, password: string) =>
  buildTestApp().request('/auth/sign-in/email', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });

describe('seeded admin', () => {
  test('can sign in with the seeded credentials', async () => {
    expect(await seedAdmin(admin)).toBe('created');
    expect((await signIn(admin.email, admin.password)).status).toBe(200);
  });

  test('running the seed again leaves the admin alone', async () => {
    await seedAdmin(admin);
    expect(await seedAdmin({ ...admin, password: 'another-password-1' })).toBe(
      'exists'
    );
    expect((await signIn(admin.email, admin.password)).status).toBe(200);
  });

  test('there is no default password: short or missing is refused', async () => {
    await expect(seedAdmin({ ...admin, password: 'admin' })).rejects.toThrow(
      /8 to 128/
    );
    await expect(seedAdmin({ ...admin, password: undefined })).rejects.toThrow(
      /8 to 128/
    );
    const rows = await db
      .select()
      .from(user)
      .where(eq(user.email, admin.email.toLowerCase()));
    expect(rows).toEqual([]);
  });
});
