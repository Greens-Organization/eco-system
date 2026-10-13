import { describe, expect, test } from 'bun:test';
import { verifyClientIp } from '@pack/auth/client-ip';
import {
  type AuthErrorCopy,
  authFetch,
  localizeAuthError,
  reasonFor,
  redactEmail,
  userMessageFor,
} from '../../src/lib/auth-proxy';

const IP_SECRET = 'dashboard-unit-client-ip-secret-0123456789';

const copy: AuthErrorCopy = {
  unknown: 'unknown',
  invalidCredentials: 'invalidCredentials',
  invalidEmail: 'invalidEmail',
  emailTaken: 'emailTaken',
  passwordTooShort: 'passwordTooShort',
  passwordTooLong: 'passwordTooLong',
  emailNotVerified: 'emailNotVerified',
  tooManyRequests: 'tooManyRequests',
  wrongPassword: 'wrongPassword',
  invalidCode: 'invalidCode',
  invalidBackupCode: 'invalidBackupCode',
  twoFactorLocked: 'twoFactorLocked',
  twoFactorExpired: 'twoFactorExpired',
};

describe('localizeAuthError', () => {
  test.each([
    ['INVALID_EMAIL_OR_PASSWORD', 'invalidCredentials'],
    ['INVALID_PASSWORD', 'wrongPassword'],
    ['INVALID_USER', 'invalidCredentials'],
    ['INVALID_EMAIL', 'invalidEmail'],
    ['USER_ALREADY_EXISTS', 'emailTaken'],
    ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'emailTaken'],
    ['PASSWORD_TOO_SHORT', 'passwordTooShort'],
    ['PASSWORD_TOO_LONG', 'passwordTooLong'],
    ['EMAIL_NOT_VERIFIED', 'emailNotVerified'],
    ['INVALID_CODE', 'invalidCode'],
    ['INVALID_BACKUP_CODE', 'invalidBackupCode'],
    ['ACCOUNT_TEMPORARILY_LOCKED', 'twoFactorLocked'],
    ['TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE', 'twoFactorLocked'],
    ['INVALID_TWO_FACTOR_COOKIE', 'twoFactorExpired'],
  ])('%s -> %s', (code, expected) => {
    expect(localizeAuthError(400, { code }, copy)).toBe(expected);
  });

  test('429 wins over any code (the rate limiter sends none)', () => {
    expect(
      localizeAuthError(429, { code: 'INVALID_EMAIL', message: 'x' }, copy)
    ).toBe('tooManyRequests');
  });

  test('an unknown code is the generic message, never the raw API text', () => {
    expect(localizeAuthError(400, { code: 'NEW', message: 'raw' }, copy)).toBe(
      'unknown'
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
    const result = await authFetch(
      'http://127.0.0.1:1/auth',
      { clientIp: '203.0.113.7', clientIpSecret: IP_SECRET },
      2_000
    );
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
    const result = await authFetch(
      `${server.url}auth`,
      { clientIp: '203.0.113.7', clientIpSecret: IP_SECRET },
      50
    );
    expect(result).toMatchObject({ ok: false, kind: 'timeout' });
    if (!result.ok) expect(reasonFor(result)).toBe('timeout');
  });

  test('forwards the request id and the client IP, signed', async () => {
    const seen: { id: string | null; ip: string | null; sig: string | null } = {
      id: null,
      ip: null,
      sig: null,
    };
    using server = Bun.serve({
      port: 0,
      fetch: (req) => {
        seen.id = req.headers.get('x-request-id');
        seen.ip = req.headers.get('x-real-ip');
        seen.sig = req.headers.get('x-client-ip-signature');
        return new Response('ok');
      },
    });
    const result = await authFetch(`${server.url}auth`, {
      requestId: 'r-9',
      clientIp: '203.0.113.7',
      clientIpSecret: IP_SECRET,
    });
    expect(result.ok).toBe(true);
    expect(seen.id).toBe('r-9');
    expect(verifyClientIp(seen.ip, seen.sig, IP_SECRET)).toBe('203.0.113.7');
  });

  // better-auth labels the session with it; without it every device in the
  // list would read as this server.
  test("forwards the browser's user agent", async () => {
    const seen: { ua: string | null } = { ua: null };
    using server = Bun.serve({
      port: 0,
      fetch: (req) => {
        seen.ua = req.headers.get('user-agent');
        return new Response('ok');
      },
    });
    await authFetch(`${server.url}auth`, {
      clientIp: '203.0.113.7',
      clientIpSecret: IP_SECRET,
      userAgent: 'Mozilla/5.0 (iPhone) Safari/604.1',
    });
    expect(seen.ua).toBe('Mozilla/5.0 (iPhone) Safari/604.1');
  });

  // The API trusts this header for rate limiting, so an IP or signature
  // smuggled in by the caller's headers must never win over this server's.
  test('the signed client IP overwrites any IP headers already passed', async () => {
    const seen: { ip: string | null; sig: string | null } = {
      ip: null,
      sig: null,
    };
    using server = Bun.serve({
      port: 0,
      fetch: (req) => {
        seen.ip = req.headers.get('x-real-ip');
        seen.sig = req.headers.get('x-client-ip-signature');
        return new Response('ok');
      },
    });
    await authFetch(`${server.url}auth`, {
      headers: { 'x-real-ip': '1.1.1.1', 'x-client-ip-signature': '1.forged' },
      clientIp: '203.0.113.7',
      clientIpSecret: IP_SECRET,
    });
    expect(seen.ip).toBe('203.0.113.7');
    expect(verifyClientIp(seen.ip, seen.sig, IP_SECRET)).toBe('203.0.113.7');
  });

  test('a client address that is not an IP sends no IP headers at all', async () => {
    const seen: { ip: string | null; sig: string | null } = {
      ip: null,
      sig: null,
    };
    using server = Bun.serve({
      port: 0,
      fetch: (req) => {
        seen.ip = req.headers.get('x-real-ip');
        seen.sig = req.headers.get('x-client-ip-signature');
        return new Response('ok');
      },
    });
    const result = await authFetch(`${server.url}auth`, {
      headers: { 'x-real-ip': '1.1.1.1' },
      clientIp: 'unknown',
      clientIpSecret: IP_SECRET,
    });
    expect(result.ok).toBe(true);
    expect(seen).toEqual({ ip: null, sig: null });
  });
});

describe('userMessageFor', () => {
  test('maps the failure kind to the localized copy', () => {
    const errors = { timeout: 't', unreachable: 'u' };
    expect(userMessageFor('timeout', errors)).toBe('t');
    expect(userMessageFor('unreachable', errors)).toBe('u');
  });
});
