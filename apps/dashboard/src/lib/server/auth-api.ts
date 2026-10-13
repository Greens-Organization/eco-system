import type { RequestEvent } from '@sveltejs/kit';
import { type AuthFetchResult, authFetch } from '#lib/auth-proxy.js';
import { env } from '#lib/env.js';
import { cookieHeader } from './cookie-header';

/**
 * Call a better-auth endpoint on the API on behalf of the browser: its
 * cookies and user agent, the dashboard origin (better-auth's CSRF check), the
 * client IP (the rate limiter's key) and the request id (log correlation).
 * With a body it is a POST, without one a GET.
 */
export function callAuth(
  event: RequestEvent,
  path: `/${string}`,
  body?: object
): Promise<AuthFetchResult> {
  return authFetch(`${env.API_URL}/auth${path}`, {
    method: body ? 'POST' : 'GET',
    requestId: event.locals.requestId,
    clientIp: event.getClientAddress(),
    clientIpSecret: env.CLIENT_IP_SECRET,
    userAgent: event.request.headers.get('user-agent'),
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      // Not the request's header: an action may have replaced the session.
      Cookie: cookieHeader(event.cookies),
      Origin: event.url.origin,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Read a better-auth error body without trusting its shape. */
export async function errorBody(
  res: Response
): Promise<{ code?: string; message?: string }> {
  const body: unknown = await res.json().catch(() => ({}));
  if (typeof body !== 'object' || body === null) return {};
  const { code, message } = body as Record<string, unknown>;
  return {
    code: typeof code === 'string' ? code : undefined,
    message: typeof message === 'string' ? message : undefined,
  };
}
