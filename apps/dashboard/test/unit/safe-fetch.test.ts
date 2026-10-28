import { describe, expect, test } from 'bun:test';
import type { ClientResponse } from 'hono/client';
import z from 'zod';
import { safeFetch } from '../../src/lib/api/safe-fetch';

const Schema = z.object({ total: z.number() });
type Body = z.infer<typeof Schema>;

const respond = (body: BodyInit | null, status = 200) =>
  Promise.resolve(
    new Response(body, { status }) as unknown as ClientResponse<Body>
  );

describe('safeFetch', () => {
  test('a valid body passes the schema', async () => {
    expect(await safeFetch(respond('{"total":3}'), Schema)).toEqual({
      success: true,
      data: { total: 3 },
    });
  });

  test('a body that drifted from the schema is a 500, not bad data', async () => {
    expect(await safeFetch(respond('{"total":"3"}'), Schema)).toEqual({
      success: false,
      error: 'Internal server error',
      status: 500,
    });
  });

  test('an error status keeps the status and the API message', async () => {
    expect(
      await safeFetch(respond('{"message":"Unauthorized"}', 401), Schema)
    ).toEqual({ success: false, error: 'Unauthorized', status: 401 });
    expect(await safeFetch(respond('{"error":"Nope"}', 403), Schema)).toEqual({
      success: false,
      error: 'Nope',
      status: 403,
    });
  });

  test('a non-JSON error body falls back to a generic message', async () => {
    expect(await safeFetch(respond('<html>', 502), Schema)).toEqual({
      success: false,
      error: 'Internal server error',
      status: 502,
    });
  });

  test('a rejected request (network) is a 500', async () => {
    const failing = Promise.reject(new Error('ECONNREFUSED')) as Promise<
      ClientResponse<Body>
    >;
    expect(await safeFetch(failing, Schema)).toEqual({
      success: false,
      error: 'Internal server error',
      status: 500,
    });
  });

  // These used to vanish: the page showed a generic error and nothing was
  // logged.
  test('every failure is logged with its cause', async () => {
    const lines: [string, string, object | undefined][] = [];
    const log = {
      warn: (msg: string, obj?: object) => lines.push(['warn', msg, obj]),
      error: (msg: string, obj?: object) => lines.push(['error', msg, obj]),
    };

    await safeFetch(respond('{"total":"3"}'), Schema, log);
    await safeFetch(respond('{"message":"Nope"}', 403), Schema, log);
    await safeFetch(
      Promise.reject(new Error('ECONNREFUSED')) as Promise<
        ClientResponse<Body>
      >,
      Schema,
      log
    );

    expect(lines.map(([level, msg]) => `${level} ${msg}`)).toEqual([
      'error api.response.schema_mismatch',
      'warn api.request.rejected',
      'error api.request.failed',
    ]);
    expect(lines[2]?.[2]).toEqual({ reason: 'ECONNREFUSED' });
  });
});
