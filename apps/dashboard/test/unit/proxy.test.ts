import { describe, expect, mock, test } from 'bun:test';
import { proxyRequest } from '../../src/lib/server/proxy';

/** A response whose headers reject writes, as undici's fetch returns under Node. */
function immutableResponse(body: BodyInit | null, init: ResponseInit) {
  const res = new Response(body, init);
  for (const method of ['set', 'append', 'delete'] as const) {
    Object.defineProperty(res.headers, method, {
      value: () => {
        throw new TypeError('immutable');
      },
    });
  }
  return res;
}

const upstreamReturning = (res: Response) =>
  mock(async (_input: RequestInfo | URL, _init?: RequestInit) => res);

describe('proxyRequest', () => {
  // Regression for 🔴 2: logHandle sets x-request-id on whatever the proxy
  // returns, and under Node that threw and turned every /auth/* into a 500.
  test('returns a response whose headers can still be modified', async () => {
    const fetch = upstreamReturning(immutableResponse('{}', { status: 200 }));
    const res = await proxyRequest(
      new Request('http://dash.test/auth/get-session'),
      'http://api.test/auth/get-session',
      { fetch }
    );

    expect(() => res.headers.set('x-request-id', 'abc')).not.toThrow();
    expect(res.headers.get('x-request-id')).toBe('abc');
  });

  test('passes status, body and every Set-Cookie through', async () => {
    const headers = new Headers();
    headers.append('set-cookie', 'better-auth.session_token=t; Path=/');
    headers.append('set-cookie', 'better-auth.session_data=d; Path=/');
    const fetch = upstreamReturning(
      immutableResponse('{"ok":true}', { status: 201, headers })
    );

    const res = await proxyRequest(
      new Request('http://dash.test/auth/sign-in/email', { method: 'POST' }),
      'http://api.test/auth/sign-in/email',
      { fetch }
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.getSetCookie()).toEqual([
      'better-auth.session_token=t; Path=/',
      'better-auth.session_data=d; Path=/',
    ]);
  });

  test('does not follow redirects, so the browser gets them', async () => {
    const fetch = upstreamReturning(
      new Response(null, { status: 302, headers: { location: '/en' } })
    );
    const res = await proxyRequest(
      new Request('http://dash.test/auth/callback'),
      'http://api.test/auth/callback',
      { fetch }
    );

    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe('manual');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/en');
  });

  test('forwards method, body and request id; drops hop-by-hop headers', async () => {
    const fetch = upstreamReturning(new Response(null, { status: 204 }));
    await proxyRequest(
      new Request('http://dash.test/auth/sign-in/email?x=1', {
        method: 'POST',
        headers: {
          host: 'dash.test',
          connection: 'keep-alive',
          cookie: 'a=b',
          'content-type': 'application/json',
        },
        body: '{"email":"a@b.c"}',
      }),
      'http://api.test/auth/sign-in/email?x=1',
      { fetch, requestId: 'req-1' }
    );

    const [target, init] = fetch.mock.calls[0] ?? [];
    const sent = new Headers(init?.headers);
    expect(target).toBe('http://api.test/auth/sign-in/email?x=1');
    expect(init?.method).toBe('POST');
    expect(await new Response(init?.body).text()).toBe('{"email":"a@b.c"}');
    expect(sent.get('x-request-id')).toBe('req-1');
    expect(sent.get('cookie')).toBe('a=b');
    expect(sent.has('host')).toBe(false);
    expect(sent.has('connection')).toBe(false);
  });

  test('sends no body on GET', async () => {
    const fetch = upstreamReturning(new Response(null, { status: 204 }));
    await proxyRequest(
      new Request('http://dash.test/auth/get-session'),
      'http://api.test/auth/get-session',
      { fetch }
    );

    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined();
  });

  test('drops the upstream encoding headers, since fetch decoded the body', async () => {
    const fetch = upstreamReturning(
      new Response('{}', {
        headers: { 'content-encoding': 'gzip', 'content-length': '999' },
      })
    );
    const res = await proxyRequest(
      new Request('http://dash.test/auth/get-session'),
      'http://api.test/auth/get-session',
      { fetch }
    );

    expect(res.headers.has('content-encoding')).toBe(false);
    expect(res.headers.get('content-length')).not.toBe('999');
  });
});
