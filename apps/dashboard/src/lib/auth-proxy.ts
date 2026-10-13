/**
 * Helpers for calling the better-auth endpoints on the Hono API from form
 * actions and hooks — the browser never talks to the API itself. Centralizes timeout handling, error classification, and
 * PII redaction so each form action stays small.
 */

import { isIP } from 'node:net';
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_SIGNATURE_HEADER,
  signClientIp,
} from '@pack/auth/client-ip';
import { traceHeaders } from '@pack/observability/propagation';

export type AuthFetchFailure = {
  ok: false;
  kind: 'timeout' | 'unreachable';
  error: unknown;
};

export type AuthFetchResult =
  | { ok: true; response: Response }
  | AuthFetchFailure;

/**
 * Wraps `fetch` with a hard timeout and converts every transport-level
 * failure into a typed result. Never throws — callers branch on `ok`.
 *
 * `clientIp` (from `event.getClientAddress()`) is required: every call
 * reaches the API from this server, so it is the only way the API's rate
 * limiter can tell users apart. It goes signed with `clientIpSecret` (the API
 * drops an unsigned one) and overwrites whatever the caller passed.
 *
 * `userAgent` is the browser's: better-auth labels the session it opens with
 * it (the device list), and without it every session would read as this
 * server.
 *
 * Pass `requestId` to forward `x-request-id` to the API so its logs
 * share the same correlation id as the dashboard's `logHandle`; the active
 * span goes as `traceparent`, so the API's spans join the dashboard's trace.
 */
export async function authFetch(
  url: string,
  init: RequestInit & {
    clientIp: string;
    clientIpSecret: string;
    userAgent?: string | null;
    requestId?: string;
  },
  timeoutMs = 10_000
): Promise<AuthFetchResult> {
  const { clientIp, clientIpSecret, userAgent, requestId, headers, ...rest } =
    init;
  const merged = new Headers(headers);
  merged.delete(CLIENT_IP_HEADER);
  merged.delete(CLIENT_IP_SIGNATURE_HEADER);
  // Not an address (never from adapter-node): send none rather than throw.
  if (isIP(clientIp)) {
    for (const [name, value] of Object.entries(
      signClientIp(clientIp, clientIpSecret)
    )) {
      merged.set(name, value);
    }
  }
  if (userAgent) merged.set('user-agent', userAgent);
  if (requestId) merged.set('x-request-id', requestId);
  for (const [name, value] of Object.entries(traceHeaders())) {
    merged.set(name, value);
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: merged,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: true, response };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return { ok: false, kind: isTimeout ? 'timeout' : 'unreachable', error };
  }
}

/** End-user-facing copy for transport failures, sourced from the
 * locale dictionary so the message matches the user's language. */
export function userMessageFor(
  kind: AuthFetchFailure['kind'],
  errors: { timeout: string; unreachable: string }
): string {
  return kind === 'timeout' ? errors.timeout : errors.unreachable;
}

/**
 * Maps better-auth's English error response to a localized message.
 * better-auth ships English-only `message`s — we dispatch on the
 * stable `code` field (or HTTP status when no code is present, e.g.
 * the rate-limiter response). Anything else is the generic "unknown"
 * string: the API's raw message is English and may say too much.
 *
 * Error code reference:
 * `node_modules/@better-auth/core/dist/error/codes.mjs` (BASE_ERROR_CODES).
 */
export type AuthErrorCopy = {
  unknown: string;
  invalidCredentials: string;
  invalidEmail: string;
  emailTaken: string;
  passwordTooShort: string;
  passwordTooLong: string;
  emailNotVerified: string;
  tooManyRequests: string;
  wrongPassword: string;
  invalidCode: string;
  invalidBackupCode: string;
  twoFactorLocked: string;
  twoFactorExpired: string;
};

export function localizeAuthError(
  status: number,
  body: { code?: string; message?: string },
  copy: AuthErrorCopy
): string {
  if (status === 429) return copy.tooManyRequests;

  switch (body.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_USER':
      return copy.invalidCredentials;
    // Only asked of a signed-in user (enabling or disabling 2FA).
    case 'INVALID_PASSWORD':
      return copy.wrongPassword;
    case 'INVALID_EMAIL':
      return copy.invalidEmail;
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return copy.emailTaken;
    case 'PASSWORD_TOO_SHORT':
      return copy.passwordTooShort;
    case 'PASSWORD_TOO_LONG':
      return copy.passwordTooLong;
    case 'EMAIL_NOT_VERIFIED':
      return copy.emailNotVerified;
    case 'INVALID_CODE':
      return copy.invalidCode;
    case 'INVALID_BACKUP_CODE':
      return copy.invalidBackupCode;
    case 'ACCOUNT_TEMPORARILY_LOCKED':
    case 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE':
      return copy.twoFactorLocked;
    case 'INVALID_TWO_FACTOR_COOKIE':
      return copy.twoFactorExpired;
    default:
      return copy.unknown;
  }
}

/** Short string suitable for `reason` log fields (never includes stack). */
export function reasonFor(failure: AuthFetchFailure): string {
  if (failure.kind === 'timeout') return 'timeout';
  return failure.error instanceof Error
    ? failure.error.message
    : String(failure.error);
}

/**
 * Redact an email for safe logging. Keeps the domain (useful for tenant
 * analytics) and a 2-char hint of the local part so support can correlate
 * with a user-reported address without exposing the full identity in logs.
 */
export function redactEmail(email: string): {
  domain: string;
  localHint: string;
} {
  const at = email.lastIndexOf('@');
  if (at < 1) return { domain: '(invalid)', localHint: '?' };
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  const hint =
    local.length <= 2 ? `${local[0] ?? '?'}***` : `${local.slice(0, 2)}***`;
  return { domain, localHint: hint };
}
