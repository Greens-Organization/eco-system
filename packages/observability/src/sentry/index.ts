import * as Sentry from '@sentry/bun';
import { sentryContextAllowlist } from './scrub';

export * from './scrub';

/**
 * Build Sentry `captureException` options from context fields, with the PII
 * allowlist applied to `extra`. Pure — easy to unit-test without a client.
 */
const asTag = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export function sentryCaptureOptions(fields: Record<string, unknown>) {
  return {
    tags: {
      support_id: asTag(fields.support_id),
      error_code: asTag(fields.error_code),
      classification: asTag(fields.classification),
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
