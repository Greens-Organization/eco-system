import { describe, expect, test } from 'bun:test';
import { signClientIp } from '@pack/auth/client-ip';
import { cache } from '@pack/cache';
import { buildTestApp, request, type TestApp } from '../helpers/app';
import {
  authenticate,
  authHeaders,
  clientIp,
  randomUser,
  type TestUser,
} from '../helpers/auth';

// Security properties of the auth wiring. Each test states the
// behavior we want; they were written to fail against the original config.

const DAY_MS = 24 * 60 * 60 * 1000;

function signIn(app: TestApp, body: object, ip: string) {
  return app.request('/auth/sign-in/email', {
    method: 'POST',
    headers: authHeaders(ip),
    body: JSON.stringify(body),
  });
}

function signUp(app: TestApp, user: TestUser) {
  return app.request('/auth/sign-up/email', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(user),
  });
}

async function burst(app: TestApp, ip: string, attempts: number) {
  const statuses: number[] = [];
  for (let i = 0; i < attempts; i++) {
    const res = await signIn(
      app,
      { email: `nobody-${i}@e2e.test`, password: 'wrong-password' },
      ip
    );
    statuses.push(res.status);
  }
  return statuses;
}

describe('rate limiting', () => {
  test('a burst of sign-ins from one client is throttled (3 per 10 s)', async () => {
    const statuses = await burst(buildTestApp(), clientIp(), 4);
    expect(statuses.slice(0, 3)).not.toContain(429);
    expect(statuses[3]).toBe(429);
  });

  // Every sign-in reaches the API from the dashboard server, so without the
  // forwarded client IP one attacker would lock everyone out.
  test('throttling one client does not lock out another', async () => {
    const app = buildTestApp();
    await burst(app, clientIp(), 4);

    const other = await signIn(
      app,
      { email: 'nobody@e2e.test', password: 'wrong-password' },
      clientIp()
    );
    expect(other.status).toBe(401);
  });

  test('counters live in Redis, so they are shared across API instances', async () => {
    await burst(buildTestApp(), clientIp(), 1);
    const keys = (await cache.send('KEYS', ['auth:*'])) as string[];
    expect(keys.some((k) => k.includes('/sign-in/email'))).toBe(true);
  });
});

describe('client IP signature', () => {
  // An attacker who reaches the API directly and rotates the IP header on
  // every request must still land in one shared bucket.
  async function burstWith(headersFor: (ip: string) => Record<string, string>) {
    const app = buildTestApp();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await app.request('/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...headersFor(clientIp()),
        },
        body: JSON.stringify({
          email: `nobody-${i}@e2e.test`,
          password: 'wrong-password',
        }),
      });
      statuses.push(res.status);
    }
    return statuses;
  }

  const secret = () => process.env.CLIENT_IP_SECRET ?? '';

  test('an unsigned IP is ignored: rotating it does not escape the limit', async () => {
    expect((await burstWith((ip) => ({ 'x-real-ip': ip })))[3]).toBe(429);
  });

  test('an IP signed with another secret is ignored', async () => {
    const statuses = await burstWith((ip) =>
      signClientIp(ip, 'not-the-shared-secret-0123456789abcdef')
    );
    expect(statuses[3]).toBe(429);
  });

  test('a signature older than a minute cannot be replayed', async () => {
    const statuses = await burstWith((ip) =>
      signClientIp(ip, secret(), Date.now() - 2 * 60_000)
    );
    expect(statuses[3]).toBe(429);
  });

  test('a freshly signed IP keys its own bucket', async () => {
    const statuses = await burstWith((ip) => signClientIp(ip, secret()));
    expect(statuses).not.toContain(429);
  });

  test('the session records the signed IP, never a spoofed one', async () => {
    const app = buildTestApp();
    const user = randomUser();
    await signUp(app, user);
    const body = JSON.stringify({ email: user.email, password: user.password });

    const signedIp = clientIp();
    const signedIn = await app.request('/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...signClientIp(signedIp, secret()),
      },
      body,
    });
    const spoofed = await app.request('/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '198.51.100.66',
      },
      body,
    });
    expect(spoofed.status).toBe(200);

    const cookie = signedIn.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    const list = (await (
      await app.request('/auth/list-sessions', { headers: { cookie } })
    ).json()) as { ipAddress?: string | null }[];
    const ips = list.map((s) => s.ipAddress);
    expect(ips).toContain(signedIp);
    expect(ips).not.toContain('198.51.100.66');
  });
});

describe('per-account limit', () => {
  // Each guess comes from a different address, as from a botnet: the per-IP
  // limit never trips, so only the per-account count can stop it.
  async function guessFromManyClients(app: TestApp, email: string, n: number) {
    const statuses: number[] = [];
    for (let i = 0; i < n; i++) {
      const res = await signIn(
        app,
        { email, password: `wrong-${i}` },
        clientIp()
      );
      statuses.push(res.status);
    }
    return statuses;
  }

  test('after 5 free wrong passwords the account waits, even for the right one', async () => {
    const app = buildTestApp();
    const user = randomUser();
    await signUp(app, user);

    // 6th failure → wait 2 s.
    expect(await guessFromManyClients(app, user.email, 6)).toEqual([
      401, 401, 401, 401, 401, 401,
    ]);

    const owner = { email: user.email, password: user.password };
    const blocked = await signIn(app, owner, clientIp());
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('x-retry-after'))).toBeGreaterThan(0);

    await Bun.sleep(2_100);
    expect((await signIn(app, owner, clientIp())).status).toBe(200);
  });

  test('a successful sign-in forgets the failures', async () => {
    const app = buildTestApp();
    const user = randomUser();
    await signUp(app, user);
    const owner = { email: user.email, password: user.password };

    await guessFromManyClients(app, user.email, 5);
    expect((await signIn(app, owner, clientIp())).status).toBe(200);
    // Back to 5 free tries.
    expect(await guessFromManyClients(app, user.email, 5)).not.toContain(429);
  });

  test('one account being slowed down does not affect another', async () => {
    const app = buildTestApp();
    const victim = randomUser();
    const other = randomUser();
    await signUp(app, victim);
    await signUp(app, other);

    await guessFromManyClients(app, victim.email, 6);
    const res = await signIn(
      app,
      { email: other.email, password: other.password },
      clientIp()
    );
    expect(res.status).toBe(200);
  });

  // Same treatment for unknown emails, so the 429 says nothing about which
  // accounts exist.
  test('an unregistered email is slowed down the same way', async () => {
    const app = buildTestApp();
    const email = randomUser().email;
    await guessFromManyClients(app, email, 6);
    expect(
      (await signIn(app, { email, password: 'x' }, clientIp())).status
    ).toBe(429);
  });

  test('the case of the email does not reset the count', async () => {
    const app = buildTestApp();
    const email = randomUser().email;
    await guessFromManyClients(app, email, 6);
    const shouted = await signIn(
      app,
      { email: email.toUpperCase(), password: 'x' },
      clientIp()
    );
    expect(shouted.status).toBe(429);
  });

  test('Redis holds a hash of the email, never the address', async () => {
    const app = buildTestApp();
    await guessFromManyClients(app, randomUser().email, 6);
    const keys = (await cache.send('KEYS', ['auth:login-*'])) as string[];

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(/^auth:login-(failures|wait):[0-9a-f]{64}$/);
      expect(await cache.ttl(key)).toBeGreaterThan(0);
    }
  });
});

describe('account enumeration', () => {
  test('signing up with a registered email looks like a new sign-up', async () => {
    const app = buildTestApp();
    const user = randomUser();
    const first = await signUp(app, user);
    const second = await signUp(app, { ...user, name: 'Someone Else' });

    expect(second.status).toBe(first.status);
    expect(await second.text()).not.toContain('USER_ALREADY_EXISTS');
  });

  test('sign-up does not open a session (the user signs in next)', async () => {
    const res = await signUp(buildTestApp(), randomUser());
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe('session cookies', () => {
  async function signInCookies() {
    const app = buildTestApp();
    const user = randomUser();
    await signUp(app, user);
    const res = await signIn(
      app,
      { email: user.email, password: user.password },
      clientIp()
    );
    expect(res.status).toBe(200);
    return res.headers.getSetCookie();
  }

  test('every auth cookie is HttpOnly and SameSite=Strict', async () => {
    const cookies = await signInCookies();
    expect(cookies.length).toBeGreaterThan(0);
    for (const cookie of cookies) {
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toMatch(/SameSite=Strict/i);
    }
  });

  // A revoked session keeps working until the cookie cache expires.
  test('the cookie cache expires within 60 s', async () => {
    const cache = (await signInCookies()).find((c) =>
      c.startsWith('better-auth.session_data=')
    );
    const maxAge = Number(cache?.match(/Max-Age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(60);
  });
});

describe('session lifetime and storage', () => {
  test('a session lasts at most 24 h from sign-in', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const res = await request(app, '/auth/get-session', { cookie });
    const body = (await res.json()) as {
      session: { createdAt: string; expiresAt: string };
    };

    const lifetime =
      new Date(body.session.expiresAt).getTime() -
      new Date(body.session.createdAt).getTime();
    expect(lifetime).toBeLessThanOrEqual(DAY_MS);
  });

  test('sessions are in Redis under the auth: namespace, every key with a TTL', async () => {
    await authenticate(buildTestApp());
    const keys = (await cache.send('KEYS', ['*'])) as string[];

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toStartWith('auth:');
      expect(await cache.ttl(key)).toBeGreaterThan(0);
    }
  });
});

describe('exposure', () => {
  test('a body over 1 MiB is refused with 413 before reaching auth', async () => {
    const res = await buildTestApp().request('/auth/sign-in/email', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email: 'a@b.c', password: 'x'.repeat(1_100_000) }),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  test('responses carry the standard security headers', async () => {
    const res = await buildTestApp().request('/status');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('strict-transport-security')).toContain('max-age');
  });

  // The browser never calls the API; only the dashboard server does.
  test('the API sends no CORS headers to a browser origin', async () => {
    const app = buildTestApp();
    const preflight = await app.request('/auth/sign-in/email', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
      },
    });
    expect(preflight.headers.get('access-control-allow-origin')).toBeNull();
    expect(
      preflight.headers.get('access-control-allow-credentials')
    ).toBeNull();
  });
});
