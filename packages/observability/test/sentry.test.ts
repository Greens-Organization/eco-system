import { describe, expect, test } from 'bun:test';
import { captureError, sentryCaptureOptions } from '../src/sentry';

describe('sentryCaptureOptions', () => {
  test('maps tags and allowlists extra (drops PII)', () => {
    const opts = sentryCaptureOptions({
      support_id: 'SUP-1',
      error_code: 'DB_DOWN',
      classification: 'technical_error',
      route: '/r',
      method: 'POST',
      status_code: 500,
      ip: '1.2.3.4',
      user_agent: 'curl',
    });

    expect(opts.tags).toEqual({
      support_id: 'SUP-1',
      error_code: 'DB_DOWN',
      classification: 'technical_error',
    });
    expect(opts.extra).toEqual({
      support_id: 'SUP-1',
      error_code: 'DB_DOWN',
      classification: 'technical_error',
      route: '/r',
      method: 'POST',
      status_code: 500,
    });
    expect(opts.extra.ip).toBeUndefined();
    expect(opts.extra.user_agent).toBeUndefined();
  });
});

describe('captureError', () => {
  test('no-op (does not throw) when Sentry is not initialized', () => {
    // Tests run with no SENTRY_DSN, so Sentry.getClient() is undefined.
    expect(() =>
      captureError(new Error('boom'), { support_id: 'S' })
    ).not.toThrow();
  });
});
