import z from 'zod';

// better-auth's `/list-sessions` row. It carries the session token, which is
// the credential itself: it stays on this server and never reaches a page.
const ListedSessionSchema = z.object({
  id: z.string(),
  token: z.string(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  createdAt: z.coerce.date(),
});

export const ListedSessionsSchema = z.array(ListedSessionSchema);
export type ListedSession = z.infer<typeof ListedSessionSchema>;

/** What a page may see of a session. */
export type Device = {
  id: string;
  browser: string | null;
  system: string | null;
  ip: string | null;
  signedInAt: string;
  current: boolean;
};

// Order matters: Edge and Samsung Internet also say "Chrome", Chrome also
// says "Safari", and Chrome and Firefox on iOS go by their own tokens.
const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/\bEdgA?\//, 'Edge'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\b(?:Firefox|FxiOS)\//, 'Firefox'],
  [/\b(?:Chrome|CriOS)\//, 'Chrome'],
  [/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
];

const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/\b(?:iPhone|iPad|iPod)\b/, 'iOS'],
  [/\bAndroid\b/, 'Android'],
  [/\bWindows\b/, 'Windows'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bLinux\b|\bX11\b/, 'Linux'],
];

const firstMatch = (value: string, patterns: ReadonlyArray<[RegExp, string]>) =>
  patterns.find(([pattern]) => pattern.test(value))?.[1] ?? null;

/** "Chrome" + "Windows" for the device list; null parts read as unknown. */
export function describeUserAgent(userAgent: string | null | undefined): {
  browser: string | null;
  system: string | null;
} {
  if (!userAgent) return { browser: null, system: null };
  return {
    browser: firstMatch(userAgent, BROWSERS),
    system: firstMatch(userAgent, SYSTEMS),
  };
}

/** The current device first, then the most recent sign-ins. */
export function toDevices(
  sessions: ListedSession[],
  currentSessionId: string
): Device[] {
  return sessions
    .map((session) => ({
      id: session.id,
      ...describeUserAgent(session.userAgent),
      ip: session.ipAddress || null,
      signedInAt: session.createdAt.toISOString(),
      current: session.id === currentSessionId,
    }))
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        b.signedInAt.localeCompare(a.signedInAt)
    );
}

/**
 * The token to revoke for a device id, looked up in the user's own list, so
 * an id from the form can only ever name one of their sessions. The current
 * one is refused: signing out is how this device leaves.
 */
export function tokenFor(
  sessions: ListedSession[],
  id: string,
  currentSessionId: string
): { kind: 'found'; token: string } | { kind: 'current' | 'not_found' } {
  if (id === currentSessionId) return { kind: 'current' };
  const session = sessions.find((s) => s.id === id);
  return session
    ? { kind: 'found', token: session.token }
    : { kind: 'not_found' };
}

const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "3 hours ago" / "há 3 horas", in the user's language. */
export function timeAgo(iso: string, now: Date, locale: string): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return format.format(-Math.floor(elapsed / ms), unit);
  }
  return format.format(0, 'minute');
}
