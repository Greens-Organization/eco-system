import { describe, expect, test } from 'bun:test';
import { CSP_NONCE_PLACEHOLDER } from '../../src/lib/csp';
import { injectCspNonce } from '../../src/lib/server/security-headers';

const html = (body: string, csp = "script-src 'self' 'nonce-abc123'") =>
  new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': csp,
      'content-length': String(body.length),
    },
  });

describe('injectCspNonce', () => {
  test('puts the response nonce where the placeholder was rendered', async () => {
    const out = await injectCspNonce(
      html(`<script nonce=${CSP_NONCE_PLACEHOLDER}>theme()</script>`)
    );
    expect(await out.text()).toBe('<script nonce=abc123>theme()</script>');
    expect(out.headers.get('content-security-policy')).toContain(
      'nonce-abc123'
    );
    // The body changed length; a stale header would truncate it.
    expect(out.headers.has('content-length')).toBe(false);
  });

  test('leaves non-HTML responses alone', async () => {
    const json = Response.json({ a: CSP_NONCE_PLACEHOLDER });
    expect(await injectCspNonce(json)).toBe(json);
  });

  test('leaves HTML without a nonce in its CSP alone', async () => {
    const res = html(`<p>${CSP_NONCE_PLACEHOLDER}</p>`, "default-src 'self'");
    expect(await injectCspNonce(res)).toBe(res);
  });

  test('keeps status and headers', async () => {
    const res = new Response(`<i>${CSP_NONCE_PLACEHOLDER}</i>`, {
      status: 404,
      headers: {
        'content-type': 'text/html',
        'content-security-policy': "script-src 'nonce-n1'",
        'x-request-id': 'r1',
      },
    });
    const out = await injectCspNonce(res);
    expect(out.status).toBe(404);
    expect(out.headers.get('x-request-id')).toBe('r1');
    expect(await out.text()).toBe('<i>n1</i>');
  });
});
