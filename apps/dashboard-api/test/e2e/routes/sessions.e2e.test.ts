import { describe, expect, test } from 'bun:test';
import { cache } from '@pack/cache';
import { buildTestApp, type TestApp } from '../helpers/app';
import {
  authHeaders,
  clientIp,
  randomUser,
  sessionCookieFrom,
  type TestUser,
} from '../helpers/auth';
import { totpFor } from '../helpers/totp';

// Signed-in devices (better-auth core: list-sessions, revoke-session,
// revoke-other-sessions). The dashboard forwards the browser's user agent and
// IP, so each session reads as the device that opened it.

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

type ListedSession = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

async function signInFrom(
  app: TestApp,
  user: TestUser,
  device: { ip: string; userAgent: string }
): Promise<string> {
  const res = await app.request('/auth/sign-in/email', {
    method: 'POST',
    headers: { ...authHeaders(device.ip), 'user-agent': device.userAgent },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const cookie = sessionCookieFrom(res);
  if (!cookie) throw new Error(`sign-in failed: ${res.status}`);
  return cookie;
}

const call = (app: TestApp, path: string, cookie: string, body?: object) =>
  app.request(`/auth${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...authHeaders(), cookie },
    body: body ? JSON.stringify(body) : undefined,
  });

async function list(app: TestApp, cookie: string): Promise<ListedSession[]> {
  const res = await call(app, '/list-sessions', cookie);
  expect(res.status).toBe(200);
  return (await res.json()) as ListedSession[];
}

async function isSignedIn(app: TestApp, cookie: string): Promise<boolean> {
  const res = await call(app, '/get-session?disableCookieCache=true', cookie);
  return (await res.json()) !== null;
}

async function userOnTwoDevices(app: TestApp) {
  const user = randomUser();
  await app.request('/auth/sign-up/email', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(user),
  });
  const laptop = { ip: clientIp(), userAgent: CHROME_WINDOWS };
  const phone = { ip: clientIp(), userAgent: SAFARI_IPHONE };
  return {
    user,
    laptop: { ...laptop, cookie: await signInFrom(app, user, laptop) },
    phone: { ...phone, cookie: await signInFrom(app, user, phone) },
  };
}

describe('signed-in devices', () => {
  test('each sign-in is a session labeled with its browser and IP', async () => {
    const app = buildTestApp();
    const { laptop, phone } = await userOnTwoDevices(app);

    const sessions = await list(app, laptop.cookie);
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => [s.userAgent, s.ipAddress]).sort()).toEqual(
      [
        [laptop.userAgent, laptop.ip],
        [phone.userAgent, phone.ip],
      ].sort()
    );
  });

  test('signing out one device ends only that one', async () => {
    const app = buildTestApp();
    const { laptop, phone } = await userOnTwoDevices(app);
    const target = (await list(app, laptop.cookie)).find(
      (s) => s.userAgent === SAFARI_IPHONE
    );

    const res = await call(app, '/revoke-session', laptop.cookie, {
      token: target?.token,
    });
    expect(res.status).toBe(200);
    expect(await isSignedIn(app, phone.cookie)).toBe(false);
    expect(await isSignedIn(app, laptop.cookie)).toBe(true);
  });

  test('"sign out everywhere else" keeps the current device', async () => {
    const app = buildTestApp();
    const { user, laptop, phone } = await userOnTwoDevices(app);
    const tablet = await signInFrom(app, user, {
      ip: clientIp(),
      userAgent: SAFARI_IPHONE,
    });

    const res = await call(app, '/revoke-other-sessions', laptop.cookie, {});
    expect(res.status).toBe(200);
    expect(await isSignedIn(app, laptop.cookie)).toBe(true);
    expect(await isSignedIn(app, phone.cookie)).toBe(false);
    expect(await isSignedIn(app, tablet)).toBe(false);
    expect(await list(app, laptop.cookie)).toHaveLength(1);
  });

  // The dashboard maps ids to tokens from the user's own list, but the API
  // must hold on its own too.
  test("another user's session cannot be revoked", async () => {
    const app = buildTestApp();
    const alice = await userOnTwoDevices(app);
    const bob = await userOnTwoDevices(app);
    const bobs = (await list(app, bob.laptop.cookie))[0];

    await call(app, '/revoke-session', alice.laptop.cookie, {
      token: bobs?.token,
    });
    expect(await isSignedIn(app, bob.laptop.cookie)).toBe(true);
  });

  test('listing and signing out devices need a signed-in user', async () => {
    const app = buildTestApp();
    expect((await call(app, '/list-sessions', '')).status).toBe(401);
    expect(
      (await call(app, '/revoke-session', '', { token: 'anything' })).status
    ).toBe(401);
    expect((await call(app, '/revoke-other-sessions', '', {})).status).toBe(
      401
    );
  });

  test('each user sees only their own devices', async () => {
    const app = buildTestApp();
    const alice = await userOnTwoDevices(app);
    const bob = await userOnTwoDevices(app);

    const alices = (await list(app, alice.laptop.cookie)).map((s) => s.id);
    const bobs = (await list(app, bob.laptop.cookie)).map((s) => s.id);
    expect(alices).toHaveLength(2);
    expect(bobs).toHaveLength(2);
    expect(alices.filter((id) => bobs.includes(id))).toEqual([]);
  });

  test('signing out on a device removes it from the list', async () => {
    const app = buildTestApp();
    const { laptop, phone } = await userOnTwoDevices(app);

    const res = await call(app, '/sign-out', phone.cookie, {});
    expect(res.status).toBe(200);
    const left = await list(app, laptop.cookie);
    expect(left.map((s) => s.userAgent)).toEqual([CHROME_WINDOWS]);
  });

  test('a device signed out from elsewhere can no longer manage devices', async () => {
    const app = buildTestApp();
    const { laptop, phone } = await userOnTwoDevices(app);
    await call(app, '/revoke-other-sessions', laptop.cookie, {});

    expect((await call(app, '/list-sessions', phone.cookie)).status).toBe(401);
    expect(
      (await call(app, '/revoke-other-sessions', phone.cookie, {})).status
    ).toBe(401);
    expect(await isSignedIn(app, laptop.cookie)).toBe(true);
  });

  // Sessions live in Redis (`auth:<token>`): revoking must remove them there
  // too, not only in Postgres, or a stale copy could keep a device in.
  test('a revoked session is gone from Redis', async () => {
    const app = buildTestApp();
    const { laptop } = await userOnTwoDevices(app);
    const phoneToken = (await list(app, laptop.cookie)).find(
      (s) => s.userAgent === SAFARI_IPHONE
    )?.token;
    expect(await cache.exists(`auth:${phoneToken}`)).toBe(true);

    await call(app, '/revoke-session', laptop.cookie, { token: phoneToken });
    expect(await cache.exists(`auth:${phoneToken}`)).toBe(false);
  });

  test('a session opened through 2FA is labeled with its browser too', async () => {
    const app = buildTestApp();
    const { user, laptop } = await userOnTwoDevices(app);

    const enabled = await call(app, '/two-factor/enable', laptop.cookie, {
      password: user.password,
    });
    const { totpURI } = (await enabled.json()) as { totpURI: string };
    const confirmed = await call(
      app,
      '/two-factor/verify-totp',
      laptop.cookie,
      {
        code: await totpFor(totpURI),
      }
    );
    const laptopCookie = sessionCookieFrom(confirmed) ?? '';

    // A third device: password first, then the code, both from its browser.
    const tablet = {
      ip: clientIp(),
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    };
    const first = await app.request('/auth/sign-in/email', {
      method: 'POST',
      headers: { ...authHeaders(tablet.ip), 'user-agent': tablet.userAgent },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    const pending = first.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    const second = await app.request('/auth/two-factor/verify-totp', {
      method: 'POST',
      headers: {
        ...authHeaders(tablet.ip),
        'user-agent': tablet.userAgent,
        cookie: pending,
      },
      body: JSON.stringify({ code: await totpFor(totpURI) }),
    });
    expect(second.status).toBe(200);

    const sessions = await list(app, laptopCookie);
    const opened = sessions.find((s) => s.userAgent === tablet.userAgent);
    expect(opened?.ipAddress).toBe(tablet.ip);
  });
});
