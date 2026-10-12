import { describe, expect, test } from 'bun:test';
import type { z } from 'zod';
import { customersSchemaRes } from '@/main/routes/v1/customers/schema';
import { employeesSchemaRes } from '@/main/routes/v1/employees/schema';
import { statsSchemaRes } from '@/main/routes/v1/stats/schema';
import { buildTestApp, request } from '../helpers/app';
import { authenticate, authHeaders } from '../helpers/auth';

// Every v1 route: closed without a session, and with one the body matches
// the route's own response schema (not a typeof spot check).
const ROUTES: [string, z.ZodType][] = [
  ['/v1/stats', statsSchemaRes],
  ['/v1/customers', customersSchemaRes],
  ['/v1/employees', employeesSchemaRes],
];

type ErrorBody = { code: string; message: string };

describe('v1 routes', () => {
  test.each(ROUTES)(
    '%s is 401 UNAUTHORIZED without a session',
    async (path) => {
      const res = await buildTestApp().request(path);
      expect(res.status).toBe(401);
      expect(((await res.json()) as ErrorBody).code).toBe('UNAUTHORIZED');
    }
  );

  test.each(ROUTES)(
    '%s answers its schema with a session',
    async (path, schema) => {
      const app = buildTestApp();
      const { cookie } = await authenticate(app);
      const res = await request(app, path, { cookie });
      expect(res.status).toBe(200);
      expect(schema.safeParse(await res.json()).error).toBeUndefined();
    }
  );

  // It used to be 401: the auth middleware ran before anything said "no such
  // route".
  test('an unknown v1 path is 404 NOT_FOUND, with or without a session', async () => {
    const app = buildTestApp();
    const anonymous = await app.request('/v1/does-not-exist');
    expect(anonymous.status).toBe(404);
    expect(((await anonymous.json()) as ErrorBody).code).toBe('NOT_FOUND');

    const { cookie } = await authenticate(app);
    const signedIn = await request(app, '/v1/does-not-exist', { cookie });
    expect(signedIn.status).toBe(404);
  });

  test('a tampered session cookie is 401', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const [name, value] = cookie.split('=');
    const flipped = `${value?.slice(0, -2)}${value?.endsWith('A') ? 'B' : 'A'}=`;
    const res = await request(app, '/v1/stats', {
      cookie: `${name}=${flipped}`,
    });
    expect(res.status).toBe(401);
  });

  test('a session ended by sign-out is 401', async () => {
    const app = buildTestApp();
    const { cookie } = await authenticate(app);
    const out = await app.request('/auth/sign-out', {
      method: 'POST',
      headers: { ...authHeaders(), cookie },
      body: '{}',
    });
    expect(out.status).toBe(200);
    expect((await request(app, '/v1/stats', { cookie })).status).toBe(401);
  });
});
