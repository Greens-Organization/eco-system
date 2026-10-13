import { Writable } from 'node:stream';
import {
  logs,
  type Logger as OtelLogger,
  SeverityNumber,
} from '@opentelemetry/api-logs';

/** pino numeric level -> OTel SeverityNumber + text. */
export function pinoLevelToSeverity(level: number): {
  severityNumber: SeverityNumber;
  severityText: string;
} {
  if (level >= 60)
    return { severityNumber: SeverityNumber.FATAL, severityText: 'FATAL' };
  if (level >= 50)
    return { severityNumber: SeverityNumber.ERROR, severityText: 'ERROR' };
  if (level >= 40)
    return { severityNumber: SeverityNumber.WARN, severityText: 'WARN' };
  if (level >= 30)
    return { severityNumber: SeverityNumber.INFO, severityText: 'INFO' };
  if (level >= 20)
    return { severityNumber: SeverityNumber.DEBUG, severityText: 'DEBUG' };
  return { severityNumber: SeverityNumber.TRACE, severityText: 'TRACE' };
}

/**
 * Structural pino fields that map onto the LogRecord itself (timestamp,
 * severity, body) or are process noise. Everything else — request_id,
 * support_id, trace_id, span_id, route, status_code, and any business fields
 * attached via setContext() — is forwarded as a LogRecord attribute.
 */
const STRUCTURAL = new Set(['level', 'time', 'msg', 'pid', 'hostname']);

export function pinoRecordToAttributes(
  record: Record<string, unknown>
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(record)) {
    if (STRUCTURAL.has(key) || value == null) continue;
    attributes[key] =
      typeof value === 'object'
        ? JSON.stringify(value)
        : (value as string | number | boolean);
  }
  return attributes;
}

/**
 * In-process pino -> OTel-logs bridge. Each newline-delimited pino JSON record
 * is re-emitted as an OTel LogRecord and exported via OTLP (-> Loki in the
 * local lgtm stack). Runs on the SAME thread as pino (no worker), so it does
 * not reintroduce the Bun worker×OTel conflict the API dodges with
 * `LOG_PRETTY=false` (see ./index.ts).
 *
 * The record is already fully composed by pino (base + per-request mixin +
 * per-event fields), so trace_id/span_id/support_id/request_id ride along as
 * attributes — that is the trace↔log correlation in Grafana.
 */
export function createOtelLogStream(): Writable {
  const otel: OtelLogger = logs.getLogger('@pack/observability/pino');
  return new Writable({
    write(chunk, _encoding, callback) {
      try {
        const record = JSON.parse(chunk.toString()) as Record<string, unknown>;
        const { severityNumber, severityText } = pinoLevelToSeverity(
          (record.level as number) ?? 30
        );
        otel.emit({
          timestamp: record.time as number,
          severityNumber,
          severityText,
          body: (record.msg as string) ?? '',
          attributes: pinoRecordToAttributes(record),
        });
      } catch {
        // A malformed line must never break the logging path.
      }
      callback();
    },
  });
}
