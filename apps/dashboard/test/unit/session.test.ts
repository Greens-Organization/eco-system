import { describe, expect, mock, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import type { AuthFetchResult } from '../../src/lib/auth-proxy';
import { resolveSession } from '../../src/lib/server/session';

const SECRET = 'dashboard-unit-secret-0123456789';
const TOKEN = 'better-auth.session_token=tok.sig';

const now = Date.now();
const user = {
  id: 'u1',
  email: 'ada@eco.local',
  name: 'Ada',
  image: null,
  emailVerified: false,
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
};
const session = {
  id: 's1',
  userId: 'u1',
  token: 'tok',
  expiresAt: new Date(now + 86_400_000).toISOString(),
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
};

/** Same encoding better-auth's `setCookieCache` uses (compact strategy). */
function signedCacheCookie(
  expiresAt: number,
  secret = SECRET,
  name = 'better-auth.session_data'
): string {
  const payload = { session, user, updatedAt: now };
  const signature = createHmac('sha256', secret)
    .update(JSON.stringify({ ...payload, expiresAt }))
    .digest('base64url');
  const value = Buffer.from(
    JSON.stringify({ session: payload, expiresAt, signature })
  ).toString('base64url');
  return `${name}=${value}`;
}

const requestWith = (cookie?: string, origin = 'http://dash.test') =>
  new Request(`${origin}/en`, {
    headers: cookie ? { cookie } : {},
  });

const apiAnswers = (body: unknown, init?: ResponseInit) =>
  mock(
    async (_cookie: string): Promise<AuthFetchResult> => ({
      ok: true,
      response: Response.json(body, init),
    })
  );

describe('resolveSession', () => {
  test('a valid cookie cache resolves locally, without calling the API', async () => {
    const fetchSession = apiAnswers(null);
    const result = await resolveSession(
      requestWith(`${TOKEN}; ${signedCacheCookie(now + 60_000)}`),
      { secret: SECRET, fetchSession }
    );

    expect(result.kind).toBe('cached');
    if (result.kind === 'cached') expect(result.user.email).toBe(user.email);
    expect(fetchSession).not.toHaveBeenCalled();
  });

  test('no cookies at all is anonymous, without calling the API', async () => {
    const fetchSession = apiAnswers(null);
    const result = await resolveSession(requestWith(), {
      secret: SECRET,
      fetchSession,
    });

    expect(result).toEqual({ kind: 'anonymous', staleCookies: false });
    expect(fetchSession).not.toHaveBeenCalled();
  });

  // Regression for 🔴 1: after 5 minutes the browser drops session_data but
  // keeps the token, and the user used to be sent back to sign-in.
  test('an expired cookie cache with a token is revalidated and refreshed', async () => {
    const fresh = 'better-auth.session_data=fresh; Max-Age=300; Path=/';
    const fetchSession = mock(
      async (_cookie: string): Promise<AuthFetchResult> => ({
        ok: true,
        response: Response.json(
          { session, user },
          { headers: { 'set-cookie': fresh } }
        ),
      })
    );
    const cookie = `${TOKEN}; ${signedCacheCookie(now - 1_000)}`;

    const result = await resolveSession(requestWith(cookie), {
      secret: SECRET,
      fetchSession,
    });

    expect(fetchSession).toHaveBeenCalledWith(cookie);
    expect(result.kind).toBe('refreshed');
    if (result.kind === 'refreshed') {
      expect(result.setCookie).toEqual([fresh]);
      expect(result.session.userId).toBe('u1');
      expect(result.session.expiresAt).toBeInstanceOf(Date);
    }
  });

  test('a cache cookie signed with another secret is not trusted', async () => {
    const fetchSession = apiAnswers({ session, user });
    const result = await resolveSession(
      requestWith(`${TOKEN}; ${signedCacheCookie(now + 60_000, 'other')}`),
      { secret: SECRET, fetchSession }
    );

    expect(fetchSession).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('refreshed');
  });

  test('a token the API rejects is anonymous with stale cookies', async () => {
    const result = await resolveSession(requestWith(TOKEN), {
      secret: SECRET,
      fetchSession: apiAnswers(null),
    });

    expect(result).toEqual({ kind: 'anonymous', staleCookies: true });
  });

  test('an unreachable API is unavailable, not anonymous', async () => {
    const result = await resolveSession(requestWith(TOKEN), {
      secret: SECRET,
      fetchSession: async () => ({
        ok: false,
        kind: 'unreachable',
        error: new Error('ECONNREFUSED'),
      }),
    });

    expect(result).toEqual({ kind: 'unavailable', reason: 'unreachable' });
  });

  test('a 5xx from the API is unavailable, not anonymous', async () => {
    const result = await resolveSession(requestWith(TOKEN), {
      secret: SECRET,
      fetchSession: apiAnswers({ message: 'boom' }, { status: 500 }),
    });

    expect(result).toEqual({
      kind: 'unavailable',
      reason: 'get-session 500',
    });
  });

  // Over https the API names the cache `__Secure-better-auth.session_data`.
  // Reading the plain name there made every request miss and pay the hop.
  test('over https the cache is read from the __Secure- cookie', async () => {
    const fetchSession = apiAnswers(null);
    const secureCache = signedCacheCookie(
      now + 60_000,
      SECRET,
      '__Secure-better-auth.session_data'
    );
    const result = await resolveSession(
      requestWith(`__Secure-${TOKEN}; ${secureCache}`, 'https://dash.test'),
      { secret: SECRET, fetchSession }
    );

    expect(result.kind).toBe('cached');
    expect(fetchSession).not.toHaveBeenCalled();
  });

  test('over https a cache without the prefix is not trusted', async () => {
    const fetchSession = apiAnswers(null);
    await resolveSession(
      requestWith(
        `__Secure-${TOKEN}; ${signedCacheCookie(now + 60_000)}`,
        'https://dash.test'
      ),
      { secret: SECRET, fetchSession }
    );

    expect(fetchSession).toHaveBeenCalledTimes(1);
  });
});
