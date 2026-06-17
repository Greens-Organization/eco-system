import { describe, expect, test } from 'bun:test';
import { trace } from '@opentelemetry/api';
import pino, { type DestinationStream } from 'pino';
import { runWithContext } from '../src/context';
import { log, loggerOptions, spanToFields } from '../src/logger';

describe('logger config', () => {
  test('base carries the contract fields', () => {
    expect(loggerOptions.base).toHaveProperty('service');
    expect(loggerOptions.base).toHaveProperty('environment');
    expect(loggerOptions.base).toHaveProperty('instance');
    expect(loggerOptions.base).toHaveProperty('version');
  });

  test('mixin is empty outside a request, merges ALS context inside', () => {
    expect(loggerOptions.mixin()).toEqual({});

    const merged = runWithContext({ request_id: 'r1', support_id: 's1' }, () =>
      loggerOptions.mixin()
    );
    expect(merged).toMatchObject({ request_id: 'r1', support_id: 's1' });
  });
});

describe('logger output', () => {
  test('emits base + per-request context into the JSON line', () => {
    const lines: Record<string, unknown>[] = [];
    const stream: DestinationStream = {
      write: (s: string) => {
        lines.push(JSON.parse(s));
      },
    };

    const testLog = pino(loggerOptions, stream);
    runWithContext({ request_id: 'rX', support_id: 'sX' }, () =>
      testLog.info({ route: '/x' }, 'hello')
    );

    const line = lines.at(-1);
    expect(line?.service).toBe(loggerOptions.base.service);
    expect(line?.request_id).toBe('rX');
    expect(line?.support_id).toBe('sX');
    expect(line?.route).toBe('/x');
    expect(line?.msg).toBe('hello');
  });

  test('exported log is a usable pino instance', () => {
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
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
