import type { TestApp } from './app';

const SESSION_COOKIE = 'better-auth.session_token';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/** A unique user payload (email collision-free across tests). */
export function randomUser(overrides: Partial<TestUser> = {}): TestUser {
  const tag = crypto.randomUUID().slice(0, 8);
  return {
    email: `user-${tag}@e2e.test`,
    password: 'password-1234',
    name: `Test ${tag}`,
    ...overrides,
  };
}

/**
 * Sign up + sign in via the real `/auth/*` routes (better-auth), returning the
 * session cookie to attach to authenticated requests via `request(app, p, {
 * cookie })`. Tests the real auth wiring, not a shortcut.
 */
export async function authenticate(
  app: TestApp,
  user: TestUser = randomUser()
): Promise<{ user: TestUser; cookie: string }> {
  await app.request('/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(user),
  });

  const res = await app.request('/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });

  const cookie = sessionCookieFrom(res);
  if (!cookie) {
    throw new Error(
      `auth helper: sem ${SESSION_COOKIE} no set-cookie (status ${res.status})`
    );
  }
  return { user, cookie };
}

/** Extract `name=value` of the session cookie from a response's Set-Cookie list. */
export function sessionCookieFrom(res: Response): string | null {
  const cookies = res.headers.getSetCookie?.() ?? [];
  const target = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return target ? (target.split(';')[0] ?? null) : null;
}
