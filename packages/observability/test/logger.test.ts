import { afterAll, describe, expect, test } from 'bun:test';
import { type LogLevel, type LogRecord, withContext } from '@logtape/logtape';
import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { runWithContext, setContext } from '../src/context';
import {
  base,
  configureLogging,
  getLogger,
  jsonLine,
  log,
  prettyLine,
  spanToFields,
  stdoutSink,
} from '../src/logger';
import { toLogLevel } from '../src/logger/levels';
import { getOtelSink, toAttributes } from '../src/logger/otel-sink';

/** Routes every record to an array, as a test that asserts on logs does. */
function capture(level: LogLevel | null = 'debug') {
  const records: LogRecord[] = [];
  configureLogging({ level, sinks: { capture: (r) => void records.push(r) } });
  return records;
}

afterAll(() => configureLogging());

describe('record properties', () => {
  test('process fields, request context and span ids on every record', () => {
    const records = capture();
    const span = trace.wrapSpanContext({
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      traceFlags: 1,
    });

    runWithContext({ request_id: 'rX', support_id: 'sX' }, () => {
      setContext({ route: '/v1/me' });
      context.with(trace.setSpan(context.active(), span), () =>
        log.info('hello', { status_code: 200 })
      );
    });

    expect(records.at(-1)?.properties).toMatchObject({
      ...base,
      request_id: 'rX',
      support_id: 'sX',
      route: '/v1/me',
      status_code: 200,
    });
  });

  test('outside a request only the process fields; a caller field wins', () => {
    const records = capture();
    getLogger('bot').info('bot.ready', { service: 'override' });
    const record = records.at(-1);
    expect(record?.category).toEqual(['eco-system', 'bot']);
    expect(record?.properties).not.toHaveProperty('request_id');
    expect(record?.properties.service).toBe('override');
  });

  test('below the level nothing is kept; silent keeps nothing at all', () => {
    let records = capture('warning');
    log.info('quiet');
    log.warn('loud');
    expect(records.map((r) => r.rawMessage)).toEqual(['loud']);

    records = capture(null);
    log.fatal('nobody hears it');
    expect(records).toEqual([]);
  });
});

describe('sinks and implicit context', () => {
  test("LogTape's withContext lands in the request context", () => {
    const records = capture();
    withContext({ job: 'poller' }, () => log.info('tick'));
    expect(records.at(-1)?.properties).toMatchObject({ job: 'poller' });
  });

  test('stdout gets the formatted line', () => {
    const written: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((chunk: string) =>
      written.push(chunk) > 0) as typeof process.stdout.write;
    try {
      stdoutSink(() => 'line\n')({} as LogRecord);
    } finally {
      process.stdout.write = original;
    }
    expect(written).toEqual(['line\n']);
  });
});

describe('redaction', () => {
  test('credentials are censored wherever a caller puts them', () => {
    const records = capture();
    log.info('sign-in', {
      password: 'hunter2',
      body: { password: 'hunter2', email: 'kept@eco.local' },
      token: 't',
      headers: { authorization: 'Bearer x', cookie: 'sid=x', accept: '*/*' },
      cacheKey: 'kept',
    });

    const properties = records.at(-1)?.properties;
    const line = JSON.stringify(properties);
    expect(line).not.toContain('hunter2');
    expect(line).not.toContain('Bearer x');
    expect(line).not.toContain('sid=x');
    expect(properties).toMatchObject({
      password: '[redacted]',
      token: '[redacted]',
      body: { password: '[redacted]', email: 'kept@eco.local' },
      headers: { accept: '*/*' },
      cacheKey: 'kept',
    });
  });
});

describe('formats', () => {
  const record = (properties: Record<string, unknown>): LogRecord => ({
    category: ['eco-system'],
    level: 'error',
    message: ['GET ', 500, ' failed'],
    rawMessage: 'GET {status_code} failed',
    timestamp: Date.UTC(2026, 9, 22, 12, 0, 0),
    properties,
  });

  test('JSON: one line, the contract fields at the root', () => {
    const line = jsonLine(
      record({ ...base, request_id: 'r1', err: new TypeError('boom') })
    );
    expect(line.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: 'ERROR',
      message: 'GET 500 failed',
      service: base.service,
      request_id: 'r1',
      err: { name: 'TypeError', message: 'boom' },
    });
  });

  test("a failed import's message survives (Bun's ResolveMessage is circular)", async () => {
    // A variable, so the type checker does not try to resolve it either.
    const missing = '#nope/missing';
    const err = await import(missing).catch((e: unknown) => e);
    const parsed = JSON.parse(jsonLine(record({ err })));
    expect(parsed.err.message).toContain("Cannot find package '#nope'");
    expect(toAttributes({ err })['exception.message']).toContain(
      "Cannot find package '#nope'"
    );
  });

  test('JSON never throws: cycles and bigints', () => {
    const loop: Record<string, unknown> = { a: 1 };
    loop.self = loop;
    const parsed = JSON.parse(jsonLine(record({ loop, n: 10n })));
    expect(parsed.loop).toEqual({ a: 1, self: '[circular]' });
    expect(parsed.n).toBe('10');
  });

  test('pretty: a warning keeps the error on one line; the path shows when it differs', () => {
    const line = prettyLine({
      ...record({
        route: '/v1/guilds/:id',
        path: '/v1/guilds/42',
        err: new Error('nope'),
      }),
      level: 'warning',
    });
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI colors.
    const plain = line.replace(/\x1b\[\d+m/g, '');
    expect(plain).toStartWith('WARN [');
    expect(plain).toContain('/v1/guilds/:id /v1/guilds/42 GET 500 failed');
    expect(plain.trimEnd().split('\n')).toHaveLength(1);
  });

  test('pretty: level, request id, route and path, the rest in the tail', () => {
    const line = prettyLine(
      record({
        ...base,
        request_id: 'ab12cd34',
        route: '/v1/me',
        path: '/v1/me',
        user_id: 'u1',
        err: new Error('boom'),
      })
    );
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI colors.
    const plain = line.replace(/\x1b\[\d+m/g, '');
    expect(plain).toStartWith('ERROR [');
    expect(plain).toContain('[ab12cd34] /v1/me GET 500 failed');
    expect(plain).toContain('"user_id":"u1"');
    expect(plain).toContain('"err":"Error: boom"');
    expect(plain).not.toContain('"service"');
    // The stack follows on its own lines.
    expect(plain.split('\n').length).toBeGreaterThan(2);
  });
});

describe('levels', () => {
  test("pino's names stay valid", () => {
    expect(toLogLevel('warn')).toBe('warning');
    expect(toLogLevel('info')).toBe('info');
    expect(toLogLevel('silent')).toBeNull();
  });
});

describe('OTel sink', () => {
  test('one LogRecord per record: body, severity, attributes, exception', async () => {
    const exporter = new InMemoryLogRecordExporter();
    const provider = new LoggerProvider({
      processors: [new SimpleLogRecordProcessor({ exporter })],
    });
    // Another test may have registered one; the global is set only once.
    logs.disable();
    logs.setGlobalLoggerProvider(provider);

    getOtelSink()({
      category: ['eco-system', 'api'],
      level: 'error',
      message: ['db connection lost'],
      rawMessage: 'db connection lost',
      timestamp: 1717000000000,
      properties: {
        request_id: 'rX',
        trace_id: 'c'.repeat(32),
        err: new Error('ECONNRESET'),
        nothing: null,
      },
    });
    await provider.forceFlush();

    const [emitted] = exporter.getFinishedLogRecords();
    expect(emitted?.body).toBe('db connection lost');
    expect(emitted?.severityNumber).toBe(SeverityNumber.ERROR);
    expect(emitted?.attributes).toMatchObject({
      'log.logger': 'eco-system.api',
      request_id: 'rX',
      trace_id: 'c'.repeat(32),
      'exception.type': 'Error',
      'exception.message': 'ECONNRESET',
    });
    expect(emitted?.attributes).not.toHaveProperty('nothing');
    logs.disable();
  });

  test('objects become JSON, bigints strings', () => {
    expect(toAttributes({ a: { b: 1 }, n: 10n, ok: true })).toEqual({
      a: '{"b":1}',
      n: '10',
      ok: true,
    });
  });
});

describe('spanToFields (trace_id/span_id correlation)', () => {
  test('empty when there is no active span', () => {
    expect(spanToFields(undefined)).toEqual({});
  });

  test('extracts trace_id/span_id from a span context', () => {
    const span = trace.wrapSpanContext({
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      traceFlags: 1,
    });
    expect(spanToFields(span)).toEqual({
      trace_id: 'a'.repeat(32),
      span_id: 'b'.repeat(16),
    });
  });
});
