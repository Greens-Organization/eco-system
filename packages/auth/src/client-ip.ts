import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

/**
 * The browser's IP, from the dashboard to the API. Every call reaches the API
 * from the dashboard server, so the API cannot see the visitor's address; the
 * dashboard forwards it, signed with a secret both share (`CLIENT_IP_SECRET`).
 * The API trusts only a fresh, valid signature: a header written by anyone
 * else, or replayed later, is dropped. Network isolation is the first
 * wall; this one holds if the API is ever reachable by mistake.
 *
 * No env access: the dashboard imports this module.
 */
export const CLIENT_IP_HEADER = 'x-real-ip';
export const CLIENT_IP_SIGNATURE_HEADER = 'x-client-ip-signature';

/** How long a signature stays valid, covering clock skew between hosts. */
export const CLIENT_IP_MAX_AGE_MS = 60_000;
export const CLIENT_IP_SECRET_MIN_LENGTH = 32;

function mac(ip: string, timestamp: string, secret: string): string {
  if (secret.length < CLIENT_IP_SECRET_MIN_LENGTH) {
    throw new Error(
      `CLIENT_IP_SECRET must have at least ${CLIENT_IP_SECRET_MIN_LENGTH} characters`
    );
  }
  return createHmac('sha256', secret)
    .update(`${timestamp}.${ip}`)
    .digest('hex');
}

/** Headers carrying `ip` and its signature. Throws on a non-IP. */
export function signClientIp(
  ip: string,
  secret: string,
  now = Date.now()
): Record<string, string> {
  if (isIP(ip) === 0) throw new Error(`Not an IP address: ${ip}`);
  const timestamp = String(now);
  return {
    [CLIENT_IP_HEADER]: ip,
    [CLIENT_IP_SIGNATURE_HEADER]: `${timestamp}.${mac(ip, timestamp, secret)}`,
  };
}

/** The IP when its signature is valid and fresh, else null. */
export function verifyClientIp(
  ip: string | null | undefined,
  signature: string | null | undefined,
  secret: string,
  now = Date.now()
): string | null {
  if (!ip || !signature || isIP(ip) === 0) return null;
  const [timestamp, received] = signature.split('.');
  if (!timestamp || !received || !/^\d+$/.test(timestamp)) return null;
  if (Math.abs(now - Number(timestamp)) > CLIENT_IP_MAX_AGE_MS) return null;

  const expected = Buffer.from(mac(ip, timestamp, secret), 'hex');
  const given = Buffer.from(received, 'hex');
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? ip : null;
}

/**
 * Keep the client IP header on `request` only when its signature checks out,
 * and always drop the signature header: nothing past this point needs it.
 *
 * Edits `request.headers` in place (an incoming request's headers are
 * mutable) instead of building a copy: under Bun, `new Request(request,
 * { headers })` ignores `headers` when they are empty and keeps the original
 * ones, so a request carrying only a spoofed IP would keep it
 * (oven-sh/bun#41994).
 */
export function stripUnverifiedClientIp(
  request: Request,
  secret: string,
  now = Date.now()
): { verified: boolean; claimed: boolean } {
  const ip = request.headers.get(CLIENT_IP_HEADER);
  const signature = request.headers.get(CLIENT_IP_SIGNATURE_HEADER);
  const verified = verifyClientIp(ip, signature, secret, now) !== null;

  request.headers.delete(CLIENT_IP_SIGNATURE_HEADER);
  if (!verified) request.headers.delete(CLIENT_IP_HEADER);
  return { verified, claimed: ip !== null };
}
