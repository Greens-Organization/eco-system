import { describe, expect, test } from 'bun:test';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import {
  createOtelLogStream,
  pinoLevelToSeverity,
  pinoRecordToAttributes,
} from '../src/logger/otel-stream';

describe('pinoLevelToSeverity', () => {
  test('maps pino numeric levels to OTel severities', () => {
    expect(pinoLevelToSeverity(10).severityText).toBe('TRACE');
    expect(pinoLevelToSeverity(30).severityNumber).toBe(SeverityNumber.INFO);
    expect(pinoLevelToSeverity(50).severityNumber).toBe(SeverityNumber.ERROR);
    expect(pinoLevelToSeverity(60).severityText).toBe('FATAL');
  });
});

describe('pinoRecordToAttributes', () => {
  test('forwards contract fields, drops structural noise, stringifies objects', () => {
    const attributes = pinoRecordToAttributes({
      level: 30,
      time: 1,
      msg: 'hi',
      pid: 99,
      hostname: 'h',
      request_id: 'r1',
      support_id: 's1',
      trace_id: 'a'.repeat(32),
      err: { type: 'X' },
      nothing: null,
    });
    expect(attributes).toMatchObject({
      request_id: 'r1',
      support_id: 's1',
      trace_id: 'a'.repeat(32),
      err: JSON.stringify({ type: 'X' }),
    });
    expect(attributes).not.toHaveProperty('level');
    expect(attributes).not.toHaveProperty('msg');
    expect(attributes).not.toHaveProperty('pid');
    expect(attributes).not.toHaveProperty('nothing');
  });
});

describe('createOtelLogStream (pino -> OTel logs bridge)', () => {
  test('emits one LogRecord per pino line with body, severity, attributes', async () => {
    const exporter = new InMemoryLogRecordExporter();
    const provider = new LoggerProvider({
      processors: [new SimpleLogRecordProcessor(exporter)],
    });
    logs.setGlobalLoggerProvider(provider);

    const stream = createOtelLogStream();
    stream.write(
      `${JSON.stringify({
        level: 50,
        time: 1717000000000,
        msg: 'db connection lost',
        request_id: 'rX',
        support_id: 'SUP-1',
        trace_id: 'c'.repeat(32),
      })}\n`
    );
    await provider.forceFlush();

    const records = exporter.getFinishedLogRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.body).toBe('db connection lost');
    expect(records[0]?.severityNumber).toBe(SeverityNumber.ERROR);
    expect(records[0]?.attributes).toMatchObject({
      request_id: 'rX',
      support_id: 'SUP-1',
      trace_id: 'c'.repeat(32),
    });
  });
});
