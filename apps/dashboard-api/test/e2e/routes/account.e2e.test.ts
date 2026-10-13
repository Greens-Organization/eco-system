import { describe, expect, test } from 'bun:test';
import { buildTestApp, type TestApp } from '../helpers/app';
import { authenticate, authHeaders } from '../helpers/auth';

// Profile actions (better-auth core): rename, change password, delete account.

const cookiesOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .filter((c) => !/Max-Age=0/i.test(c))
    .map((c) => c.split(';')[0])
    .join('; ');

const post = (app: TestApp, path: string, cookie: string, body: object) =>
  app.request(`/auth${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), cookie },
    body: JSON.stringify(body),
  });

const me = async (app: TestApp, cookie: string) => {
  const res = await app.request('/v1/me', { headers: { cookie } });
  return res.status === 200 ? ((await res.json()) as { name: string }) : null;
};

const signIn = (app: TestApp, email: string, password: string) =>
  post(app, '/sign-in/email', '', { email, password });

describe('account', () => {
  test('renaming is visible on the next read', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const res = await post(app, '/update-user', cookie, {
      name: 'Ada Renamed',
    });
    expect(res.status).toBe(200);
    expect((await me(app, cookie))?.name).toBe('Ada Renamed');
  });

  test('changing the password needs the current one', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const res = await post(app, '/change-password', cookie, {
      currentPassword: 'not-the-password',
      newPassword: 'brand-new-password-1',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe(
      'INVALID_PASSWORD'
    );
  });

  test('a new password replaces the old and signs out other devices', async () => {
    const app = buildTestApp();
    const { user, cookie: laptop } = await authenticate(app);
    const phone = cookiesOf(await signIn(app, user.email, user.password));

    const res = await post(app, '/change-password', laptop, {
      currentPassword: user.password,
      newPassword: 'brand-new-password-1',
      revokeOtherSessions: true,
    });
    expect(res.status).toBe(200);
    const rotated = cookiesOf(res);

    expect(await me(app, rotated)).not.toBeNull();
    expect(await me(app, phone)).toBeNull();
    expect((await signIn(app, user.email, user.password)).status).toBe(401);
    expect((await signIn(app, user.email, 'brand-new-password-1')).status).toBe(
      200
    );
  });

  // better-auth skips the password while the session is "fresh", and ours
  // always are (24 h): the guard plugin makes it mandatory.
  test('deleting the account without the password is refused', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const res = await post(app, '/delete-user', cookie, {});
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe(
      'PASSWORD_REQUIRED'
    );
    expect(await me(app, cookie)).not.toBeNull();
  });

  test('a wrong password does not delete anything', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const res = await post(app, '/delete-user', cookie, {
      password: 'nope-nope-nope',
    });
    expect(res.status).toBe(400);
    expect(await me(app, cookie)).not.toBeNull();
  });

  test('with the password, the account and its sessions are gone', async () => {
    const app = buildTestApp();
    const { user, cookie } = await authenticate(app);
    const res = await post(app, '/delete-user', cookie, {
      password: user.password,
    });
    expect(res.status).toBe(200);
    expect(await me(app, cookie)).toBeNull();
    expect((await signIn(app, user.email, user.password)).status).toBe(401);
  });
});
