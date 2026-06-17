import type { ZodError } from 'zod';
import { AppError } from './app-error';
import { parseZodErrorIssues } from './utils';

/**
 * Validation error from Zod / schema parsing. Always BAD_REQUEST (400) with
 * classification `validation_error` (never routed to Sentry).
 */
export class SchemaError extends AppError {
  public override readonly name = 'SchemaError';

  constructor(message: string, context?: Record<string, unknown>) {
    super('BAD_REQUEST', message, {
      classification: 'validation_error',
      context,
    });
  }

  static fromZod<T>(error: ZodError<T>, raw?: unknown): SchemaError {
    return new SchemaError(
      parseZodErrorIssues(error.issues),
      raw === undefined ? undefined : { raw: JSON.stringify(raw) }
    );
  }
}
