import type { ContextLocalStorage } from '@logtape/logtape';
import { type Span, trace } from '@opentelemetry/api';
import { type RequestContext, requestContextStorage } from '../context';

/** trace_id/span_id from an active OTel span (empty when none / OTel off). */
export function spanToFields(span: Span | undefined): Record<string, string> {
  if (!span) return {};
  const { traceId, spanId } = span.spanContext();
  return { trace_id: traceId, span_id: spanId };
}

/**
 * LogTape's implicit context, read on every record: the per-process fields
 * (`base`), the request's context (`runWithContext` / `setContext`, which
 * keep working as before) and the active span's ids. What pino's `base` and
 * `mixin` did; a field the caller passes wins over these.
 */
export function recordContext(
  base: Record<string, unknown>
): ContextLocalStorage<Record<string, unknown>> {
  return {
    getStore: () => ({
      ...base,
      ...requestContextStorage.getStore(),
      ...spanToFields(trace.getActiveSpan()),
    }),
    run: (store, callback) =>
      requestContextStorage.run(store as RequestContext, callback),
  };
}
