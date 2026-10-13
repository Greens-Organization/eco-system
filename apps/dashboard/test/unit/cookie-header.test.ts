import { describe, expect, test } from 'bun:test';
import type { Cookies } from '@sveltejs/kit';
import { cookieHeader } from '../../src/lib/server/cookie-header';

/** A Cookies stub over a name → raw value map, as SvelteKit stores them. */
const cookiesOf = (raw: Record<string, string>) =>
  ({
    getAll: (opts?: { decode?: (value: string) => string }) =>
      Object.entries(raw).map(([name, value]) => ({
        name,
        value: (opts?.decode ?? decodeURIComponent)(value),
      })),
  }) as unknown as Cookies;

describe('cookieHeader', () => {
  test('sends every cookie as stored', () => {
    expect(
      cookieHeader(
        cookiesOf({ 'better-auth.session_token': 'tok.sig', theme: 'dark' })
      )
    ).toBe('better-auth.session_token=tok.sig; theme=dark');
  });

  // Decoding %2B to + would change better-auth's signed value and fail its
  // HMAC check, the same bug forwardSetCookies avoids on the way in.
  test('does not decode values', () => {
    expect(cookieHeader(cookiesOf({ s: 'a%2Bb%3D' }))).toBe('s=a%2Bb%3D');
  });
});
