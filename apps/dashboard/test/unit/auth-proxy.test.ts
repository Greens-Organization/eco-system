import { describe, expect, test } from 'bun:test';
import {
  type AuthErrorCopy,
  authFetch,
  localizeAuthError,
  reasonFor,
  redactEmail,
  userMessageFor,
} from '../../src/lib/auth-proxy';

const copy: AuthErrorCopy = {
  unknown: 'unknown',
  invalidCredentials: 'invalidCredentials',
  invalidEmail: 'invalidEmail',
  emailTaken: 'emailTaken',
  passwordTooShort: 'passwordTooShort',
  passwordTooLong: 'passwordTooLong',
  emailNotVerified: 'emailNotVerified',
  tooManyRequests: 'tooManyRequests',
};

describe('localizeAuthError', () => {
  test.each([
    ['INVALID_EMAIL_OR_PASSWORD', 'invalidCredentials'],
    ['INVALID_PASSWORD', 'invalidCredentials'],
    ['INVALID_USER', 'invalidCredentials'],
    ['INVALID_EMAIL', 'invalidEmail'],
    ['USER_ALREADY_EXISTS', 'emailTaken'],
    ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'emailTaken'],
    ['PASSWORD_TOO_SHORT', 'passwordTooShort'],
    ['PASSWORD_TOO_LONG', 'passwordTooLong'],
    ['EMAIL_NOT_VERIFIED', 'emailNotVerified'],
  ])('%s -> %s', (code, expected) => {
    expect(localizeAuthError(400, { code }, copy)).toBe(expected);
  });

  test('429 wins over any code (the rate limiter sends none)', () => {
    expect(
      localizeAuthError(429, { code: 'INVALID_EMAIL', message: 'x' }, copy)
    ).toBe('tooManyRequests');
  });

  test('an unknown code falls back to the API message, then to unknown', () => {
    expect(localizeAuthError(400, { code: 'NEW', message: 'raw' }, copy)).toBe(
      'raw'
    );
    expect(localizeAuthError(500, {}, copy)).toBe('unknown');
  });
});

describe('redactEmail', () => {
  test('keeps the lowercased domain and a 2-char hint', () => {
    expect(redactEmail('Ada.Lovelace@Example.COM')).toEqual({
      domain: 'example.com',
      localHint: 'Ad***',
    });
  });

  test('short local parts keep one char', () => {
    expect(redactEmail('ab@x.io').localHint).toBe('a***');
  });

  test('splits on the last @ and never throws on garbage', () => {
    expect(redactEmail('"a@b"@x.io').domain).toBe('x.io');
    expect(redactEmail('no-at-sign')).toEqual({
      domain: '(invalid)',
      localHint: '?',
    });
    expect(redactEmail('@x.io').domain).toBe('(invalid)');
  });
});

describe('authFetch', () => {
  test('a refused connection is "unreachable" and does not throw', async () => {
    // Port 1 on loopback: nothing listens there.
    const result = await authFetch('http://127.0.0.1:1/auth', {}, 2_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('unreachable');
      expect(reasonFor(result)).toBeString();
    }
  });

  test('a slow upstream is "timeout"', async () => {
    using server = Bun.serve({
      port: 0,
      fetch: () => Bun.sleep(500).then(() => new Response('late')),
    });
    const result = await authFetch(`${server.url}auth`, {}, 50);
    expect(result).toMatchObject({ ok: false, kind: 'timeout' });
    if (!result.ok) expect(reasonFor(result)).toBe('timeout');
  });

  test('forwards the request id header', async () => {
    const seen: { id: string | null } = { id: null };
    using server = Bun.serve({
      port: 0,
      fetch: (req) => {
        seen.id = req.headers.get('x-request-id');
        return new Response('ok');
      },
    });
    const result = await authFetch(`${server.url}auth`, { requestId: 'r-9' });
    expect(result.ok).toBe(true);
    expect(seen.id).toBe('r-9');
  });
});

describe('userMessageFor', () => {
  test('maps the failure kind to the localized copy', () => {
    const errors = { timeout: 't', unreachable: 'u' };
    expect(userMessageFor('timeout', errors)).toBe('t');
    expect(userMessageFor('unreachable', errors)).toBe('u');
  });
});
