import { describe, expect, test } from 'bun:test';
import type { ErrorEvent, EventHint } from '@sentry/bun';
import { scrubPii, sentryContextAllowlist } from '../src/sentry/scrub';

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
  test('keeps only allowlisted request fields', () => {
    const event = {
      user: { id: 'u1', email: 'a@b.com' },
      request: {
        method: 'POST',
        url: 'https://api.test/auth/reset?token=secret&email=a@b.com',
        query_string: 'token=secret',
        data: { password: 'hunter2' },
        cookies: { sid: 'x' },
        env: { REMOTE_ADDR: '203.0.113.1' },
        headers: {
          authorization: 'Bearer x',
          cookie: 'sid=x',
          'set-cookie': 'sid=y',
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '203.0.113.1',
          'user-agent': 'Mozilla/5.0',
          'content-type': 'application/json',
          'x-request-id': 'req-1',
        },
      },
    } as unknown as ErrorEvent;

    const out = scrubPii(event, hint);

    expect(out?.user).toBeUndefined();
    expect(out?.request).toEqual({
      method: 'POST',
      url: 'https://api.test/auth/reset',
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-1' },
    });
  });

  test('breadcrumbs keep their shape but lose message and data', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'fetch',
          level: 'info',
          timestamp: 1,
          type: 'http',
          message: 'GET /users?email=a@b.com',
          data: { url: '/users?email=a@b.com', status_code: 200 },
        },
      ],
    } as unknown as ErrorEvent;

    expect(scrubPii(event, hint)?.breadcrumbs).toEqual([
      { category: 'fetch', level: 'info', timestamp: 1, type: 'http' },
    ]);
  });

  test('returns the event when there is nothing to scrub', () => {
    const event = { message: 'x' } as unknown as ErrorEvent;
    expect(scrubPii(event, hint)).toBe(event);
  });
});
