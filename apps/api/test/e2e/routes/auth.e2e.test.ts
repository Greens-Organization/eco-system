import { describe, expect, test } from 'bun:test';
import { buildTestApp } from '../helpers/app';
import { randomUser, sessionCookieFrom } from '../helpers/auth';

describe('auth flow (better-auth, real DB)', () => {
  test('sign-up then sign-in issues a session cookie', async () => {
    const app = buildTestApp();
    const u = randomUser();

    const signUp = await app.request('/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(u),
    });
    expect([200, 201]).toContain(signUp.status);

    const signIn = await app.request('/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: u.password }),
    });
    expect(signIn.status).toBe(200);
    expect(sessionCookieFrom(signIn)).toBeTruthy();
  });

  test('rejects a too-short password (min 8)', async () => {
    const app = buildTestApp();
    const u = randomUser({ password: 'short' });

    const res = await app.request('/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(u),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
