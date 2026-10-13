import { describe, expect, test } from 'bun:test';
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_MAX_AGE_MS,
  CLIENT_IP_SIGNATURE_HEADER,
  signClientIp,
  stripUnverifiedClientIp,
  verifyClientIp,
} from '../src/client-ip';

const SECRET = 'client-ip-unit-secret-0123456789abcdef';
const NOW = 1_800_000_000_000;

const signed = (ip: string, secret = SECRET, now = NOW) => {
  const headers = signClientIp(ip, secret, now);
  return {
    ip: headers[CLIENT_IP_HEADER] ?? '',
    signature: headers[CLIENT_IP_SIGNATURE_HEADER] ?? '',
  };
};

describe('signClientIp / verifyClientIp', () => {
  test('a fresh signature verifies, for IPv4 and IPv6', () => {
    for (const address of ['203.0.113.7', '2001:db8::1']) {
      const { ip, signature } = signed(address);
      expect(verifyClientIp(ip, signature, SECRET, NOW + 1_000)).toBe(address);
    }
  });

  test('another IP under the same signature is refused', () => {
    const { signature } = signed('203.0.113.7');
    expect(verifyClientIp('203.0.113.8', signature, SECRET, NOW)).toBeNull();
  });

  test('a signature made with another secret is refused', () => {
    const { ip, signature } = signed('203.0.113.7', 'x'.repeat(32));
    expect(verifyClientIp(ip, signature, SECRET, NOW)).toBeNull();
  });

  test('an old signature cannot be replayed', () => {
    const { ip, signature } = signed('203.0.113.7');
    expect(
      verifyClientIp(ip, signature, SECRET, NOW + CLIENT_IP_MAX_AGE_MS + 1)
    ).toBeNull();
    expect(
      verifyClientIp(ip, signature, SECRET, NOW + CLIENT_IP_MAX_AGE_MS)
    ).toBe(ip);
  });

  test('garbage never throws and never verifies', () => {
    const { signature } = signed('203.0.113.7');
    for (const [ip, sig] of [
      [null, signature],
      ['203.0.113.7', null],
      ['not-an-ip', signature],
      ['203.0.113.7', 'nodot'],
      ['203.0.113.7', 'abc.def'],
      ['203.0.113.7', `${NOW}.zz`],
      ['203.0.113.7', `${NOW}.${'0'.repeat(64)}`],
    ] as const) {
      expect(verifyClientIp(ip, sig, SECRET, NOW)).toBeNull();
    }
  });

  test('refuses a short secret and a non-IP to sign', () => {
    expect(() => signClientIp('203.0.113.7', 'short')).toThrow(/32/);
    expect(() => signClientIp('localhost', SECRET)).toThrow(/IP/);
  });
});

describe('stripUnverifiedClientIp', () => {
  const requestWith = (headers: Record<string, string>) =>
    new Request('http://api.test/auth/sign-in/email', {
      method: 'POST',
      headers,
      body: '{"email":"a@b.c"}',
    });

  test('keeps a verified IP, drops the signature, leaves the body alone', async () => {
    const request = requestWith(signClientIp('203.0.113.7', SECRET));
    expect(stripUnverifiedClientIp(request, SECRET).verified).toBe(true);
    expect(request.headers.get(CLIENT_IP_HEADER)).toBe('203.0.113.7');
    expect(request.headers.has(CLIENT_IP_SIGNATURE_HEADER)).toBe(false);
    expect(await request.text()).toBe('{"email":"a@b.c"}');
  });

  // The case that once slipped through: the spoofed IP as the only header.
  // Copying the request with the cleaned headers kept it under Bun.
  test('drops an unsigned (spoofed) IP even when it is the only header', () => {
    const request = requestWith({ [CLIENT_IP_HEADER]: '198.51.100.1' });
    expect(stripUnverifiedClientIp(request, SECRET)).toEqual({
      verified: false,
      claimed: true,
    });
    expect([...request.headers.keys()]).toEqual([]);
  });

  test('drops a forged signature along with its IP', () => {
    const request = requestWith({
      [CLIENT_IP_HEADER]: '198.51.100.1',
      [CLIENT_IP_SIGNATURE_HEADER]: `${Date.now()}.${'0'.repeat(64)}`,
      'content-type': 'application/json',
    });
    stripUnverifiedClientIp(request, SECRET);
    expect([...request.headers.keys()]).toEqual(['content-type']);
  });

  test('a request with no IP at all is not a claim', () => {
    expect(stripUnverifiedClientIp(requestWith({}), SECRET).claimed).toBe(
      false
    );
  });
});
