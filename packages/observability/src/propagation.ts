import { context, propagation } from '@opentelemetry/api';

/**
 * W3C `traceparent` (and `baggage`) for the active span, to send with an
 * outgoing request so the callee's spans join this trace. Empty while
 * tracing is off.
 */
export function traceHeaders(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}
