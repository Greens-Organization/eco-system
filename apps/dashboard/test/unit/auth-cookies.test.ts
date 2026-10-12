import { describe, expect, test } from 'bun:test';
import type { Cookies } from '@sveltejs/kit';
import {
  clearAuthCookies,
  forwardSetCookies,
  isAuthCookie,
} from '../../src/lib/server/auth-cookies';

type SetCall = { name: string; value: string; opts: Record<string, unknown> };

function fakeCookies(present: string[] = []) {
  const sets: SetCall[] = [];
  const deletes: { name: string; path: unknown }[] = [];
  const cookies = {
    set: (name: string, value: string, opts: Record<string, unknown>) =>
      sets.push({ name, value, opts }),
    delete: (name: string, opts: { path: string }) =>
      deletes.push({ name, path: opts.path }),
    getAll: () => present.map((name) => ({ name, value: 'v' })),
  } as unknown as Cookies;
  return { cookies, sets, deletes };
}

describe('isAuthCookie', () => {
  test('matches better-auth cookies with and without __Secure-', () => {
    expect(isAuthCookie('better-auth.session_token')).toBe(true);
    expect(isAuthCookie('__Secure-better-auth.session_data')).toBe(true);
    expect(isAuthCookie('theme')).toBe(false);
    expect(isAuthCookie('x-better-auth.session_token')).toBe(false);
  });
});

describe('forwardSetCookies', () => {
  test('does not re-encode the value, and keeps the attributes', () => {
    const { cookies, sets } = fakeCookies();
    // better-auth sends a percent-encoded signed token; the parser decodes it
    // once, and SvelteKit must write it back without encodeURIComponent.
    forwardSetCookies(cookies, [
      'better-auth.session_token=tok.c2ln%2Bnb%2F%3D; Max-Age=300; Path=/; HttpOnly; SameSite=Lax',
    ]);

    expect(sets).toHaveLength(1);
    const [call] = sets;
    expect(call?.name).toBe('better-auth.session_token');
    expect(call?.value).toBe('tok.c2ln+nb/=');
    const encode = call?.opts.encode as (v: string) => string;
    expect(encode('tok.c2ln+nb/=')).toBe('tok.c2ln+nb/=');
    expect(call?.opts.path).toBe('/');
    expect(call?.opts.maxAge).toBe(300);
    expect(call?.opts.httpOnly).toBe(true);
  });

  test('defaults the path to / when the header has none', () => {
    const { cookies, sets } = fakeCookies();
    forwardSetCookies(cookies, ['better-auth.session_token=t']);
    expect(sets[0]?.opts.path).toBe('/');
  });
});

describe('clearAuthCookies', () => {
  test('deletes only the better-auth cookies, at path /', () => {
    const { cookies, deletes } = fakeCookies([
      'better-auth.session_token',
      '__Secure-better-auth.session_data',
      'theme',
    ]);
    clearAuthCookies(cookies);

    expect(deletes).toEqual([
      { name: 'better-auth.session_token', path: '/' },
      { name: '__Secure-better-auth.session_data', path: '/' },
    ]);
  });
});
