import { describe, expect, test } from 'bun:test';
import { buildTestApp } from '../helpers/app';

describe('GET /ready (readiness, real DB)', () => {
  test('200 ready — pings the migrated test database', async () => {
    const app = buildTestApp();
    const res = await app.request('/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ready' });
  });
});
