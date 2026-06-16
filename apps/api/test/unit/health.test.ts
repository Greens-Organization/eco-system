import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import {
  createReadyRoute,
  type ReadyDeps,
} from '../../src/main/routes/public/ready';
import { status } from '../../src/main/routes/public/status';

const statusOf = async (res: Response): Promise<string> => {
  const json = (await res.json()) as { status: string };
  return json.status;
};

describe('liveness /status', () => {
  test('always 200 ok, with no shutdown awareness', async () => {
    const app = new Hono().route('/status', status);
    const res = await app.request('/status');
    expect(res.status).toBe(200);
    expect(await statusOf(res)).toBe('ok');
  });
});

describe('readiness /ready', () => {
  const mount = (deps: ReadyDeps) =>
    new Hono().route('/ready', createReadyRoute(deps));

  test('db ok + not draining -> 200 ready', async () => {
    const app = mount({ ping: async () => {}, isShuttingDown: () => false });
    const res = await app.request('/ready');
    expect(res.status).toBe(200);
    expect(await statusOf(res)).toBe('ready');
  });

  test('db unreachable -> 503 not_ready', async () => {
    const app = mount({
      ping: async () => {
        throw new Error('connection refused');
      },
      isShuttingDown: () => false,
    });
    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    expect(await statusOf(res)).toBe('not_ready');
  });

  test('shutting down -> 503 shutting_down, DB not even pinged', async () => {
    let pinged = false;
    const app = mount({
      ping: async () => {
        pinged = true;
      },
      isShuttingDown: () => true,
    });
    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    expect(await statusOf(res)).toBe('shutting_down');
    expect(pinged).toBe(false);
  });
});
