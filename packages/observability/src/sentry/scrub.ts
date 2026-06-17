import type { ErrorEvent, EventHint } from '@sentry/bun';

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

/**
 * Sentry `beforeSend`: strip PII before the event leaves the process. If the
 * scrub itself throws, drop the event (return null) rather than risk a leak.
 */
export function scrubPii(
  event: ErrorEvent,
  _hint: EventHint
): ErrorEvent | null {
  try {
    event.user = undefined;
    if (event.request) {
      event.request.cookies = undefined;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }
    return event;
  } catch {
    return null;
  }
}
