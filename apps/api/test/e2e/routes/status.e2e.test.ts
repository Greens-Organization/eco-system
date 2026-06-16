import { describe, expect, test } from 'bun:test';
import { buildTestApp } from '../helpers/app';

describe('GET /status (liveness)', () => {
  test('always 200 ok', async () => {
    const app = buildTestApp();
    const res = await app.request('/status');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
