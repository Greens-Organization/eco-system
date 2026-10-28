import type { LogLevel, LogRecord, TextFormatter } from '@logtape/logtape';

/** The message with its `{placeholders}` filled in. */
export function renderMessage(record: LogRecord): string {
  return record.message
    .map((part, i) =>
      i % 2 === 0 || typeof part === 'string'
        ? String(part)
        : JSON.stringify(part)
    )
    .join('');
}

/** An Error as plain data: name, message, stack and its own fields. */
function errorFields(error: Error): Record<string, unknown> {
  return {
    ...Object.fromEntries(Object.entries(error)),
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause !== undefined ? { cause: String(error.cause) } : {}),
  };
}

/** A JSON.stringify replacer that never throws: no cycles, no bigint. */
function jsonValue() {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown) => {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value !== 'object' || value === null) return value;
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    return value instanceof Error ? errorFields(value) : value;
  };
}

/**
 * One JSON object per line (stdout in production, the log file): an
 * envelope (`@timestamp`, `level`, `logger`, `message`) with every property
 * at the root, so the contract fields keep their names (`service`,
 * `request_id`, `trace_id`, …). The message renders like the dev line;
 * LogTape's own JSON formatter quotes string values inside it.
 */
export const jsonLine: TextFormatter = (record) => {
  const line: Record<string, unknown> = {
    '@timestamp': new Date(record.timestamp).toISOString(),
    level: record.level === 'warning' ? 'WARN' : record.level.toUpperCase(),
    logger: record.category.join('.'),
    message: renderMessage(record),
  };
  // The envelope first and never overwritten by a property of the same name.
  for (const [key, value] of Object.entries(record.properties)) {
    if (!(key in line)) line[key] = value;
  }
  return `${JSON.stringify(line, jsonValue())}\n`;
};

const ansi = (code: number) => (text: string) => `\x1b[${code}m${text}\x1b[39m`;
const gray = ansi(90);
const cyan = ansi(36);

const LABELS: Record<LogLevel, string> = {
  trace: gray('TRACE'),
  debug: ansi(34)('DEBUG'),
  info: ansi(32)('INFO'),
  warning: ansi(33)('WARN'),
  error: ansi(31)('ERROR'),
  fatal: ansi(35)('FATAL'),
};

/**
 * Shown in the line's head (request id, then route and path) or left out:
 * the process fields are the same on every line of a terminal.
 */
const OUT_OF_TAIL = new Set([
  'service',
  'environment',
  'instance',
  'version',
  'region',
  'request_id',
  'requestId',
  'route',
  'path',
]);

const isError = (value: unknown): value is Error => value instanceof Error;

/**
 * Development output, one line per record like pino-pretty gave:
 * `INFO [14:02:11]: [ab12cd34] /v1/me GET 200 12ms {"status_code":200}`.
 * On an error or fatal record, each Error's stack follows on its own lines.
 */
export const prettyLine: TextFormatter = (record) => {
  const p = record.properties;
  const time = new Date(record.timestamp).toTimeString().slice(0, 8);
  const id = p.request_id ?? p.requestId;
  const path = p.path !== p.route ? p.path : undefined;
  const head = [id ? `[${id}]` : '', p.route, path]
    .filter((part) => typeof part === 'string' && part !== '')
    .join(' ');

  const tail: Record<string, unknown> = {};
  const errors: Error[] = [];
  for (const [key, value] of Object.entries(p)) {
    if (OUT_OF_TAIL.has(key) || value === undefined) continue;
    if (isError(value)) {
      errors.push(value);
      tail[key] = `${value.name}: ${value.message}`;
    } else {
      tail[key] = value;
    }
  }

  const parts = [
    `${LABELS[record.level]} [${time}]:`,
    head && gray(head),
    cyan(renderMessage(record)),
    Object.keys(tail).length > 0 && gray(JSON.stringify(tail)),
  ].filter(Boolean);
  // A stack is worth the lines only when something actually broke.
  const broke = record.level === 'error' || record.level === 'fatal';
  const stacks = broke
    ? errors.map((error) => `\n${gray(error.stack ?? '')}`)
    : [];
  return `${parts.join(' ')}${stacks.join('')}\n`;
};
