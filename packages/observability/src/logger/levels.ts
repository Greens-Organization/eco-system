import type { LogLevel } from '@logtape/logtape';
import { SeverityNumber } from '@opentelemetry/api-logs';

/**
 * `LOG_LEVEL` values. pino's names stay valid (`warn`, `silent`) so the
 * `.env` files did not change with the logger; `silent` turns logging off.
 */
export const LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'warning',
  'error',
  'fatal',
  'silent',
] as const;

export type LogLevelSetting = (typeof LOG_LEVELS)[number];

/** The LogTape level for a `LOG_LEVEL`; null logs nothing. */
export function toLogLevel(setting: LogLevelSetting): LogLevel | null {
  if (setting === 'silent') return null;
  return setting === 'warn' ? 'warning' : setting;
}

export const SEVERITY: Record<
  LogLevel,
  { severityNumber: SeverityNumber; severityText: string }
> = {
  trace: { severityNumber: SeverityNumber.TRACE, severityText: 'TRACE' },
  debug: { severityNumber: SeverityNumber.DEBUG, severityText: 'DEBUG' },
  info: { severityNumber: SeverityNumber.INFO, severityText: 'INFO' },
  warning: { severityNumber: SeverityNumber.WARN, severityText: 'WARN' },
  error: { severityNumber: SeverityNumber.ERROR, severityText: 'ERROR' },
  fatal: { severityNumber: SeverityNumber.FATAL, severityText: 'FATAL' },
};
