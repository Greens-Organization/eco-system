import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import {
  AppError,
  codeToStatus,
  defaultClassification,
  type ErrorClassification,
  SchemaError,
  shouldReportToSentry,
  statusToCode,
} from '../src/errors';

describe('error codes <-> status', () => {
  test('statusToCode maps known statuses incl. 429, unknown -> 500', () => {
    expect(statusToCode(400)).toBe('BAD_REQUEST');
    expect(statusToCode(404)).toBe('NOT_FOUND');
    expect(statusToCode(429)).toBe('TOO_MANY_REQUESTS');
    expect(statusToCode(500)).toBe('INTERNAL_SERVER_ERROR');
    expect(statusToCode(418)).toBe('INTERNAL_SERVER_ERROR');
  });

  test('codeToStatus is the inverse incl. 429', () => {
    expect(codeToStatus('BAD_REQUEST')).toBe(400);
    expect(codeToStatus('TOO_MANY_REQUESTS')).toBe(429);
    expect(codeToStatus('INTERNAL_SERVER_ERROR')).toBe(500);
  });
});

describe('classification', () => {
  test('defaultClassification derives from status', () => {
    expect(defaultClassification(400)).toBe('validation_error');
    expect(defaultClassification(422)).toBe('validation_error');
    expect(defaultClassification(500)).toBe('technical_error');
    expect(defaultClassification(503)).toBe('technical_error');
    expect(defaultClassification(404)).toBe('business_error');
    expect(defaultClassification(429)).toBe('business_error');
    expect(defaultClassification(401)).toBe('business_error');
  });

  test('shouldReportToSentry: only technical/critical', () => {
    const cases: [ErrorClassification, boolean][] = [
      ['business_error', false],
      ['validation_error', false],
      ['technical_error', true],
      ['critical_incident', true],
    ];
    for (const [classification, expected] of cases) {
      expect(shouldReportToSentry(classification)).toBe(expected);
    }
  });
});

describe('AppError', () => {
  test('derives statusCode/errorCode/classification from code', () => {
    const err = new AppError('NOT_FOUND', 'user not found');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
    expect(err.classification).toBe('business_error');
    expect(err.message).toBe('user not found');
  });

  test('5xx defaults to technical_error', () => {
    expect(new AppError('INTERNAL_SERVER_ERROR', 'boom').classification).toBe(
      'technical_error'
    );
  });

  test('options override errorCode/classification/userMessage/eventCategory', () => {
    const err = new AppError('NOT_FOUND', 'gone', {
      errorCode: 'USER_GONE',
      classification: 'critical_incident',
      userMessage: 'Conta indisponível.',
      eventCategory: 'integration_error',
    });
    expect(err.errorCode).toBe('USER_GONE');
    expect(err.classification).toBe('critical_incident');
    expect(err.userMessage).toBe('Conta indisponível.');
    expect(err.eventCategory).toBe('integration_error');
  });
});

describe('SchemaError', () => {
  test('fromZod -> BAD_REQUEST + validation_error with aggregated message', () => {
    const result = z.object({ name: z.string() }).safeParse({ name: 123 });
    if (result.success) throw new Error('expected parse to fail');

    const err = SchemaError.fromZod(result.error);
    expect(err).toBeInstanceOf(SchemaError);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('SchemaError');
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.statusCode).toBe(400);
    expect(err.classification).toBe('validation_error');
    expect(err.message.length).toBeGreaterThan(0);
  });

  test('fromZod stores raw context only when provided', () => {
    const result = z.object({ n: z.number() }).safeParse({ n: 'x' });
    if (result.success) throw new Error('expected parse to fail');

    expect(SchemaError.fromZod(result.error).context).toBeUndefined();

    const raw = { n: 'x' };
    expect(SchemaError.fromZod(result.error, raw).context).toEqual({
      raw: JSON.stringify(raw),
    });
  });
});
