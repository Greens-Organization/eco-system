import type { LogRecord, Sink } from '@logtape/logtape';
import type { AnyValueMap } from '@opentelemetry/api-logs';
import { logs } from '@opentelemetry/api-logs';
import { renderMessage } from './format';
import { SEVERITY } from './levels';

/**
 * A record's properties as OTel attributes: primitives as they are, objects
 * as JSON, an Error as the semantic-convention `exception.*` attributes.
 * `request_id`, `support_id`, `trace_id`, `span_id`, `route`… ride along,
 * which is the trace↔log correlation in Grafana.
 */
export function toAttributes(properties: Record<string, unknown>): AnyValueMap {
  const attributes: AnyValueMap = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value == null) continue;
    if (value instanceof Error) {
      attributes['exception.type'] = value.name;
      attributes['exception.message'] = value.message;
      if (value.stack) attributes['exception.stacktrace'] = value.stack;
    } else if (typeof value === 'object') {
      attributes[key] = JSON.stringify(value);
    } else if (typeof value === 'bigint') {
      attributes[key] = value.toString();
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      attributes[key] = value;
    }
  }
  return attributes;
}

/**
 * Mirrors each record to OTel logs (OTLP → Loki), next to stdout. Not
 * `@logtape/otel`: that one pins an older OTel SDK than the catalog's and
 * brings the gRPC and proto exporters along. The OTel logger is looked up
 * per record because telemetry registers its provider after this module
 * loads.
 */
export function getOtelSink(name = '@pack/observability'): Sink {
  return (record: LogRecord) => {
    logs.getLogger(name).emit({
      timestamp: record.timestamp,
      ...SEVERITY[record.level],
      body: renderMessage(record),
      attributes: {
        'log.logger': record.category.join('.'),
        ...toAttributes(record.properties),
      },
    });
  };
}
