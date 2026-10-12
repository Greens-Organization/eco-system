import { describe, expect, test } from 'bun:test';
import { buildTestApp, request } from '../helpers/app';
import { authenticate } from '../helpers/auth';

describe('GET /v1/stats (auth-protected)', () => {
  test('401 without a session cookie', async () => {
    const app = buildTestApp();
    const res = await app.request('/v1/stats');
    expect(res.status).toBe(401);
  });

  test('200 + shape with an authenticated session', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);

    const res = await request(app, '/v1/stats', { cookie });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      totalUsers: number;
      activeUsers: number;
      recentActivity: unknown[];
    };
    expect(typeof body.totalUsers).toBe('number');
    expect(typeof body.activeUsers).toBe('number');
    expect(Array.isArray(body.recentActivity)).toBe(true);
  });
});
