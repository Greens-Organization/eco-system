import { describe, expect, test } from 'bun:test';
import {
  describeUserAgent,
  type ListedSession,
  timeAgo,
  toDevices,
  tokenFor,
} from '../../src/lib/server/devices';

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1',
  firefoxLinux:
    'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

describe('describeUserAgent', () => {
  test.each([
    [UA.chromeWindows, 'Chrome', 'Windows'],
    [UA.edge, 'Edge', 'Windows'],
    [UA.safariIphone, 'Safari', 'iOS'],
    [UA.chromeIphone, 'Chrome', 'iOS'],
    [UA.firefoxLinux, 'Firefox', 'Linux'],
    [UA.samsung, 'Samsung Internet', 'Android'],
    [UA.safariMac, 'Safari', 'macOS'],
  ])('%#: %s', (ua, browser, system) => {
    expect(describeUserAgent(ua)).toEqual({ browser, system });
  });

  test('a server-side client or nothing at all reads as unknown', () => {
    expect(describeUserAgent('node')).toEqual({ browser: null, system: null });
    expect(describeUserAgent(null)).toEqual({ browser: null, system: null });
  });
});

const session = (
  id: string,
  createdAt: string,
  extra: Partial<ListedSession> = {}
): ListedSession => ({
  id,
  token: `token-${id}`,
  ipAddress: '203.0.113.1',
  userAgent: UA.chromeWindows,
  createdAt: new Date(createdAt),
  ...extra,
});

const sessions = [
  session('old', '2026-10-10T10:00:00Z'),
  session('current', '2026-10-11T10:00:00Z'),
  session('new', '2026-10-12T10:00:00Z', {
    userAgent: UA.safariIphone,
    ipAddress: '',
  }),
];

describe('toDevices', () => {
  test('puts the current device first, then the newest', () => {
    expect(toDevices(sessions, 'current').map((d) => d.id)).toEqual([
      'current',
      'new',
      'old',
    ]);
  });

  test('never exposes the session token', () => {
    const devices = toDevices(sessions, 'current');
    expect(JSON.stringify(devices)).not.toContain('token-');
    expect(devices[1]).toEqual({
      id: 'new',
      browser: 'Safari',
      system: 'iOS',
      ip: null,
      signedInAt: '2026-10-12T10:00:00.000Z',
      current: false,
    });
  });
});

describe('tokenFor', () => {
  test("finds the token of one of the user's own sessions", () => {
    expect(tokenFor(sessions, 'old', 'current')).toEqual({
      kind: 'found',
      token: 'token-old',
    });
  });

  test('refuses the current session and unknown ids', () => {
    expect(tokenFor(sessions, 'current', 'current')).toEqual({
      kind: 'current',
    });
    expect(tokenFor(sessions, 'someone-elses', 'current')).toEqual({
      kind: 'not_found',
    });
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-12T12:00:00Z');

  test('speaks the user language', () => {
    expect(timeAgo('2026-10-12T09:00:00Z', now, 'en')).toBe('3 hours ago');
    expect(timeAgo('2026-10-12T09:00:00Z', now, 'pt')).toBe('há 3 horas');
    expect(timeAgo('2026-10-10T12:00:00Z', now, 'es')).toBe('anteayer');
  });

  test('under a minute is "now"', () => {
    expect(timeAgo('2026-10-12T11:59:30Z', now, 'en')).toBe('this minute');
  });
});
