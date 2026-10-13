import type { ErrorEvent, EventHint } from '@sentry/core';

/**
 * Request-context fields allowed into Sentry (LGPD: no PII). `ip`/`user_agent`
 * and actor ids stay in the structured log only, which we control.
 */
const SENTRY_CONTEXT_ALLOWLIST = [
  'support_id',
  'error_code',
  'classification',
  'trace_id',
  'route',
  'method',
  'status_code',
] as const;

/** Filter a context object down to the fields allowed in Sentry. */
export function sentryContextAllowlist(
  ctx: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SENTRY_CONTEXT_ALLOWLIST) {
    if (ctx[key] !== undefined) out[key] = ctx[key];
  }
  return out;
}

/** Request headers allowed into Sentry: they describe the request, not the user. */
const REQUEST_HEADER_ALLOWLIST = [
  'accept',
  'content-length',
  'content-type',
  'x-request-id',
] as const;

/**
 * Sentry `beforeSend`: keep only what is known to be safe (LGPD), rather than
 * removing what is known to be unsafe — a new field is then dropped by
 * default. Out go the user, the request body, cookies, the query string,
 * every header not in the allowlist (auth, cookies, forwarded IPs) and
 * breadcrumb payloads. If the scrub itself throws, drop the event rather
 * than risk a leak.
 */
export function scrubPii(
  event: ErrorEvent,
  _hint: EventHint
): ErrorEvent | null {
  try {
    event.user = undefined;

    if (event.request) {
      const { method, url, headers } = event.request;
      const kept: Record<string, string> = {};
      for (const name of REQUEST_HEADER_ALLOWLIST) {
        const value = headers?.[name];
        if (value !== undefined) kept[name] = value;
      }
      event.request = {
        method,
        // The query string can carry tokens and emails.
        url: url?.split('?')[0],
        headers: kept,
      };
    }

    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(
        ({ category, level, timestamp, type }) => ({
          category,
          level,
          timestamp,
          type,
        })
      );
    }
    return event;
  } catch {
    return null;
  }
}
