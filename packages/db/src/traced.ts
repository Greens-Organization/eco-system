import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('@pack/db');

/**
 * Run a query inside an OTel client span, so it shows up under the request's
 * trace in Tempo. postgres.js has no OTel instrumentation, so spans are
 * explicit at the call site. Without an SDK configured this is a no-op.
 *
 * Span name and attributes follow the database semantic conventions:
 * `SELECT user`, `db.system.name=postgresql`.
 *
 * @example
 * const rows = await traced('SELECT', 'user', () =>
 *   db.select().from(user).where(eq(user.id, id))
 * );
 */
export function traced<T>(
  operation: string,
  collection: string,
  query: () => PromiseLike<T>
): Promise<T> {
  return tracer.startActiveSpan(
    `${operation} ${collection}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system.name': 'postgresql',
        'db.operation.name': operation,
        'db.collection.name': collection,
      },
    },
    async (span) => {
      try {
        return await query();
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
