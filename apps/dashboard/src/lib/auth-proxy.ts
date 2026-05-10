/**
 * Helpers for proxying form-action requests to the better-auth endpoints
 * on the Hono API. Centralizes timeout handling, error classification, and
 * PII redaction so each form action stays small.
 */

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
 * Pass `requestId` to forward `x-request-id` to the API so its logs
 * share the same correlation id as the dashboard's `logHandle`.
 */
export async function authFetch(
  url: string,
  init: RequestInit & { requestId?: string },
  timeoutMs = 10_000
): Promise<AuthFetchResult> {
  const { requestId, headers, ...rest } = init;
  const merged = new Headers(headers);
  if (requestId) merged.set('x-request-id', requestId);

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
 * the rate-limiter response) and fall back to the API's raw message,
 * then to a generic "unknown" string.
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
};

export function localizeAuthError(
  status: number,
  body: { code?: string; message?: string },
  copy: AuthErrorCopy
): string {
  if (status === 429) return copy.tooManyRequests;

  switch (body.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'INVALID_USER':
      return copy.invalidCredentials;
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
    default:
      return body.message ?? copy.unknown;
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
    local.length <= 2
      ? `${local[0] ?? '?'}***`
      : `${local.slice(0, 2)}***`;
  return { domain, localHint: hint };
}
