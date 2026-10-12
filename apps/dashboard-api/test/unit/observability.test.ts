import { describe, expect, test } from 'bun:test';
import { AppError } from '@pack/observability/errors';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { z } from 'zod';
import { handleError } from '../../src/main/infra/error-handler';
import {
  type AppVariables,
  observability,
} from '../../src/main/middleware/observability';

type ErrBody = {
  code: string;
  message: string;
  requestId?: string;
  support_id?: string;
};

/**
 * Isolated test app: the observability middleware + central error handler over
 * a few throwing routes. Imports stay off `@pack/auth`/`@pack/db` (the type
 * import of AppVariables is erased), so this runs without a DB.
 */
function buildApp() {
  const app = new Hono<{ Variables: AppVariables }>({ strict: false });
  app.use('*', requestId());
  app.use('*', observability());
  app.onError(handleError);

  app.get('/ok', (c) => c.json({ ok: true }));
  app.get('/technical', () => {
    throw new AppError('INTERNAL_SERVER_ERROR', 'db connection lost');
  });
  app.get('/business', () => {
    throw new AppError('NOT_FOUND', 'user 42 missing', {
      userMessage: 'Usuário não encontrado.',
    });
  });
  app.get('/raw', () => {
    throw new Error('totally unexpected');
  });
  app.get('/zod', (c) =>
    c.json(z.object({ id: z.number() }).parse({ id: 'nope' }))
  );
  app.get('/http-400', () => {
    throw new HTTPException(400, { message: 'bad cursor' });
  });
  app.get('/http-503', () => {
    throw new HTTPException(503, { message: 'pool exhausted at 10.0.0.5' });
  });
  app.get('/items/:id', (c) => {
    const ctx = c.get('obsContext');
    return c.json({ route: ctx?.route, path: ctx?.path, ip: ctx?.ip ?? null });
  });

  return app;
}

describe('observability pipeline (e2e via app.request)', () => {
  const app = buildApp();

  const getJson = async (path: string): Promise<ErrBody> => {
    const res = await app.request(path);
    return (await res.json()) as ErrBody;
  };

  test('happy path passes through untouched', async () => {
    const res = await app.request('/ok');
    expect(res.status).toBe(200);
  });

  test('technical AppError -> 500, support_id in body, internal message hidden', async () => {
    const res = await app.request('/technical');
    expect(res.status).toBe(500);

    const json = (await res.json()) as ErrBody;
    expect(json.code).toBe('INTERNAL_SERVER_ERROR');
    expect(json.message).toBe('Internal Server Error');
    expect(json.message).not.toContain('db connection lost');
    expect(json.support_id).toMatch(/^SUP-[0-9A-F]{12}$/);
    expect(json.requestId).toBeTruthy();
  });

  test('business AppError -> mapped status + userMessage + support_id', async () => {
    const res = await app.request('/business');
    expect(res.status).toBe(404);

    const json = (await res.json()) as ErrBody;
    expect(json.code).toBe('NOT_FOUND');
    expect(json.message).toBe('Usuário não encontrado.');
    expect(json.support_id).toMatch(/^SUP-/);
  });

  test('unknown thrown error -> 500 + support_id + generic message', async () => {
    const res = await app.request('/raw');
    expect(res.status).toBe(500);

    const json = (await res.json()) as ErrBody;
    expect(json.code).toBe('INTERNAL_SERVER_ERROR');
    expect(json.message).toBe('Internal Server Error');
    expect(json.support_id).toMatch(/^SUP-/);
  });

  test('each request gets a distinct support_id', async () => {
    const [a, b] = await Promise.all([
      getJson('/technical'),
      getJson('/technical'),
    ]);
    expect(a.support_id).not.toBe(b.support_id);
  });
});

describe('error handler branches', () => {
  const app = buildApp();

  test('a ZodError is a 4xx validation error, never a 500', async () => {
    const res = await app.request('/zod');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const json = (await res.json()) as ErrBody;
    expect(json.code).not.toBe('INTERNAL_SERVER_ERROR');
  });

  test('an HTTPException 4xx keeps its message', async () => {
    const res = await app.request('/http-400');
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrBody).message).toBe('bad cursor');
  });

  // It used to echo err.message, internals included, on 5xx too.
  test('an HTTPException 5xx hides its message', async () => {
    const res = await app.request('/http-503');
    expect(res.status).toBe(503);
    const json = (await res.json()) as ErrBody;
    expect(json.message).toBe('Internal Server Error');
    expect(JSON.stringify(json)).not.toContain('10.0.0.5');
  });
});

describe('request context', () => {
  // The middleware used to read its own `/*` as the route.
  test('route is the handler pattern; path is the concrete URL', async () => {
    const res = await buildApp().request('/items/42');
    expect(await res.json()).toEqual({
      route: '/items/:id',
      path: '/items/42',
      ip: null,
    });
  });

  test('a forged X-Forwarded-For is not logged as the client IP', async () => {
    const res = await buildApp().request('/items/1', {
      headers: { 'x-forwarded-for': '6.6.6.6', 'cf-connecting-ip': '6.6.6.6' },
    });
    expect(((await res.json()) as { ip: string | null }).ip).toBeNull();
  });
});
