import { describe, expect, test } from 'bun:test';
import { buildTestApp, type TestApp } from '../helpers/app';
import { authenticate, authHeaders, type TestUser } from '../helpers/auth';
import { totpFor } from '../helpers/totp';

// Optional TOTP (better-auth `twoFactor` plugin). Every call gets its own
// client IP: `/two-factor/*` allows 3 requests per 10 s per client.

/** `name=value` pairs from a response, ready for a Cookie header. */
function cookiesOf(res: Response): string {
  return res.headers
    .getSetCookie()
    .filter((c) => !/Max-Age=0/i.test(c))
    .map((c) => c.split(';')[0])
    .join('; ');
}

const post = (app: TestApp, path: string, body: object, cookie = '') =>
  app.request(`/auth${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), cookie },
    body: JSON.stringify(body),
  });

/** A signed-up user with TOTP enabled and verified. */
async function userWithTotp(app: TestApp) {
  const { user, cookie } = await authenticate(app);
  const enabled = await post(
    app,
    '/two-factor/enable',
    { password: user.password },
    cookie
  );
  expect(enabled.status).toBe(200);
  const { totpURI, backupCodes } = (await enabled.json()) as {
    totpURI: string;
    backupCodes: string[];
  };

  const verified = await post(
    app,
    '/two-factor/verify-totp',
    { code: await totpFor(totpURI) },
    cookie
  );
  expect(verified.status).toBe(200);
  // Confirming 2FA rotates the session: the old cookie is revoked.
  const rotated = cookiesOf(verified);
  expect(rotated).toContain('better-auth.session_token=');
  return { user, cookie: rotated, totpURI, backupCodes };
}

/** First step of a sign-in for a 2FA user: returns the pending-2FA cookie. */
async function signInFirstStep(app: TestApp, user: TestUser) {
  const res = await post(app, '/sign-in/email', {
    email: user.email,
    password: user.password,
  });
  expect(res.status).toBe(200);
  return { res, cookie: cookiesOf(res) };
}

describe('two-factor (TOTP)', () => {
  test('enabling needs the password', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const res = await post(
      app,
      '/two-factor/enable',
      { password: 'not-the-password' },
      cookie
    );
    expect(res.status).toBe(400);
  });

  test('2FA stays off until a code from the app is confirmed', async () => {
    const app = buildTestApp();
    const { user, cookie } = await authenticate(app);
    await post(app, '/two-factor/enable', { password: user.password }, cookie);

    const { res } = await signInFirstStep(app, user);
    expect(await res.json()).not.toHaveProperty('twoFactorRedirect');
  });

  test('a password alone no longer opens a session', async () => {
    const app = buildTestApp();
    const { user } = await userWithTotp(app);

    const { res, cookie } = await signInFirstStep(app, user);
    expect(await res.json()).toMatchObject({
      twoFactorRedirect: true,
      twoFactorMethods: ['totp'],
    });
    expect(cookie).not.toContain('session_token');
    expect(cookie).toContain('two_factor');
  });

  test('a wrong code is refused; the right one opens the session', async () => {
    const app = buildTestApp();
    const { user, totpURI } = await userWithTotp(app);
    const { cookie } = await signInFirstStep(app, user);

    const wrong = await post(
      app,
      '/two-factor/verify-totp',
      { code: '000000' },
      cookie
    );
    expect(wrong.status).toBe(401);

    const right = await post(
      app,
      '/two-factor/verify-totp',
      { code: await totpFor(totpURI) },
      cookie
    );
    expect(right.status).toBe(200);
    expect(cookiesOf(right)).toContain('better-auth.session_token=');
  });

  test('a backup code works once', async () => {
    const app = buildTestApp();
    const { user, backupCodes } = await userWithTotp(app);
    const code = backupCodes[0] ?? '';

    const first = await signInFirstStep(app, user);
    const used = await post(
      app,
      '/two-factor/verify-backup-code',
      { code },
      first.cookie
    );
    expect(used.status).toBe(200);
    expect(cookiesOf(used)).toContain('better-auth.session_token=');

    const second = await signInFirstStep(app, user);
    const reused = await post(
      app,
      '/two-factor/verify-backup-code',
      { code },
      second.cookie
    );
    expect(reused.status).toBe(401);
  });

  test('disabling needs the password and restores password-only sign-in', async () => {
    const app = buildTestApp();
    const { user, cookie } = await userWithTotp(app);

    const refused = await post(
      app,
      '/two-factor/disable',
      { password: 'not-the-password' },
      cookie
    );
    expect(refused.status).toBe(400);

    const disabled = await post(
      app,
      '/two-factor/disable',
      { password: user.password },
      cookie
    );
    expect(disabled.status).toBe(200);

    const { res } = await signInFirstStep(app, user);
    expect(await res.json()).not.toHaveProperty('twoFactorRedirect');
  });
});
