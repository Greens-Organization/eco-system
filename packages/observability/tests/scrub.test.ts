import { describe, expect, test } from 'bun:test';
import type { ErrorEvent, EventHint } from '@sentry/bun';
import { scrubPii, sentryContextAllowlist } from '../sentry/scrub';

const hint = {} as EventHint;

describe('sentryContextAllowlist', () => {
  test('keeps only allowlisted fields, drops PII and actor ids', () => {
    const out = sentryContextAllowlist({
      support_id: 'SUP-1',
      error_code: 'DB_DOWN',
      classification: 'technical_error',
      trace_id: 't1',
      route: '/r',
      method: 'GET',
      status_code: 500,
      ip: '1.2.3.4',
      user_agent: 'curl',
      cliente_id: 42,
    });

    expect(out).toEqual({
      support_id: 'SUP-1',
      error_code: 'DB_DOWN',
      classification: 'technical_error',
      trace_id: 't1',
      route: '/r',
      method: 'GET',
      status_code: 500,
    });
    expect(out.ip).toBeUndefined();
    expect(out.user_agent).toBeUndefined();
    expect(out.cliente_id).toBeUndefined();
  });

  test('omits undefined fields', () => {
    expect(sentryContextAllowlist({ support_id: 'S' })).toEqual({
      support_id: 'S',
    });
  });
});

describe('scrubPii', () => {
  test('removes user, cookies and auth/cookie headers, keeps the rest', () => {
    const event = {
      user: { id: 'u1', email: 'a@b.com' },
      request: {
        cookies: 'sid=x',
        headers: { authorization: 'Bearer x', cookie: 'sid=x', 'x-keep': 'ok' },
      },
    } as unknown as ErrorEvent;

    const out = scrubPii(event, hint);

    expect(out?.user).toBeUndefined();
    expect(out?.request?.cookies).toBeUndefined();
    expect(out?.request?.headers?.authorization).toBeUndefined();
    expect(out?.request?.headers?.cookie).toBeUndefined();
    expect(out?.request?.headers?.['x-keep']).toBe('ok');
  });

  test('returns the event when there is nothing to scrub', () => {
    const event = { message: 'x' } as unknown as ErrorEvent;
    expect(scrubPii(event, hint)).toBe(event);
  });
});
