import * as Sentry from '@sentry/bun';
import { sentryContextAllowlist } from './scrub';

export * from './scrub';

/**
 * Build Sentry `captureException` options from context fields, with the PII
 * allowlist applied to `extra`. Pure — easy to unit-test without a client.
 */
export function sentryCaptureOptions(fields: Record<string, unknown>) {
  return {
    tags: {
      support_id: fields.support_id as string | undefined,
      error_code: fields.error_code as string | undefined,
      classification: fields.classification as string | undefined,
    },
    extra: sentryContextAllowlist(fields),
  };
}

/**
 * Capture a technical/critical error in Sentry (PII allowlisted). No-op when
 * Sentry is not initialized (no SENTRY_DSN) — dev/CI/tests. Keeps `@sentry/bun`
 * encapsulated in this package so consumers depend on the abstraction.
 */
export function captureError(
  error: unknown,
  fields: Record<string, unknown>
): void {
  if (!Sentry.getClient()) return;
  Sentry.captureException(error, sentryCaptureOptions(fields));
}
