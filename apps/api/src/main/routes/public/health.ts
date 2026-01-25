import { Hono } from 'hono';
import { isServerShuttingDown } from '@/main/infra/graceful-shutdown';

export const health = new Hono();

health.get('/', async (c) => {
  if (isServerShuttingDown()) {
    return c.json(
      {
        status: 'shutting_down',
        message: 'Server is gracefully shutting down',
      },
      503
    );
  }

  return c.json({ status: 'ok' }, 200);
});
