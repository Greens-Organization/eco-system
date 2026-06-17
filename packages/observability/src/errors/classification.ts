/**
 * Error classification (CTO log/error contract) — decides Sentry routing.
 *
 *   business_error    — expected domain error (e.g. insufficient balance)
 *   validation_error  — invalid input caught at the edge (Zod / schema)
 *   technical_error   — real technical failure (DB down, upstream 5xx)
 *   critical_incident — technical failure with operational impact
 *
 * See tasks/todo/observability.md §4.
 */
export type ErrorClassification =
  | 'business_error'
  | 'validation_error'
  | 'technical_error'
  | 'critical_incident';

/** business/validation → log only; technical/critical → log + Sentry. */
export function shouldReportToSentry(
  classification: ErrorClassification
): boolean {
  return (
    classification === 'technical_error' ||
    classification === 'critical_incident'
  );
}

/** Default classification derived from the HTTP status code. */
export function defaultClassification(status: number): ErrorClassification {
  if (status === 400 || status === 422) return 'validation_error';
  if (status >= 500) return 'technical_error';
  return 'business_error'; // 401/402/403/404/405/409/429
}
