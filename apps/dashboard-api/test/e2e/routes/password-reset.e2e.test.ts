import { describe, expect, test } from 'bun:test';
import { buildTestApp, type TestApp } from '../helpers/app';
import { authenticate, authHeaders } from '../helpers/auth';
import { mailTo, waitForMail } from '../helpers/mail';

// Forgot / reset password, end to end: the API sends real mail to Mailpit
// (docker-compose.test.yml) and the test follows the link it contains.

const DASHBOARD = 'http://localhost:3000';

const post = (app: TestApp, path: string, body: object, cookie = '') =>
  app.request(`/auth${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), cookie },
    body: JSON.stringify(body),
  });

const requestReset = (app: TestApp, email: string, locale = 'pt') =>
  post(app, '/request-password-reset', {
    email,
    redirectTo: `${DASHBOARD}/${locale}/reset-password`,
  });

/** The token from the link in the mail. */
async function tokenFromMail(email: string) {
  const mail = await waitForMail(email);
  const href = /href="([^"]+)"/.exec(mail.html)?.[1]?.replaceAll('&amp;', '&');
  const link = new URL(href ?? '');
  return { mail, link, token: link.searchParams.get('token') ?? '' };
}

const me = async (app: TestApp, cookie: string) =>
  (await app.request('/v1/me', { headers: { cookie } })).status;

describe('password reset', () => {
  test('mails a link to the dashboard page, in the page language', async () => {
    const app = buildTestApp();
    const { user } = await authenticate(app);
    expect((await requestReset(app, user.email, 'pt')).status).toBe(200);

    const { mail, link, token } = await tokenFromMail(user.email);
    expect(mail.subject).toBe('Redefina sua senha');
    expect(`${link.origin}${link.pathname}`).toBe(
      `${DASHBOARD}/pt/reset-password`
    );
    expect(token.length).toBeGreaterThan(10);
  });

  test('the token sets a new password and signs every device out', async () => {
    const app = buildTestApp();
    const { user, cookie } = await authenticate(app);
    await requestReset(app, user.email);
    const { token } = await tokenFromMail(user.email);

    const res = await post(app, '/reset-password', {
      newPassword: 'reset-password-123',
      token,
    });
    expect(res.status).toBe(200);
    expect(await me(app, cookie)).toBe(401);

    const signIn = (password: string) =>
      post(app, '/sign-in/email', { email: user.email, password });
    expect((await signIn(user.password)).status).toBe(401);
    expect((await signIn('reset-password-123')).status).toBe(200);
  });

  test('a token works once', async () => {
    const app = buildTestApp();
    const { user } = await authenticate(app);
    await requestReset(app, user.email);
    const { token } = await tokenFromMail(user.email);

    await post(app, '/reset-password', {
      newPassword: 'first-new-pass-1',
      token,
    });
    const again = await post(app, '/reset-password', {
      newPassword: 'second-new-pass-1',
      token,
    });
    expect(again.status).toBe(400);
    expect(((await again.json()) as { code: string }).code).toBe(
      'INVALID_TOKEN'
    );
  });

  // Same answer, no mail: the form must not reveal which emails exist.
  test('an unknown email gets the same answer and no mail', async () => {
    const app = buildTestApp();
    const known = await authenticate(app);
    const a = await requestReset(app, known.user.email);
    const b = await requestReset(app, 'nobody-here@e2e.test');

    expect(b.status).toBe(a.status);
    expect(await b.json()).toEqual(await a.json());
    await Bun.sleep(500);
    expect(await mailTo('nobody-here@e2e.test')).toEqual([]);
  });

  test('a link to a foreign site is refused', async () => {
    const app = buildTestApp();
    const { user } = await authenticate(app);
    const res = await post(app, '/request-password-reset', {
      email: user.email,
      redirectTo: 'https://evil.example/steal',
    });
    expect(res.status).toBe(403);
  });
});
