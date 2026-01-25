// see more https://www.better-auth.com/docs/integrations/hono

import { auth as bAuth } from '@pack/auth/server';
import { Hono } from 'hono';

export const auth = new Hono<{
  Variables: {
    user: typeof bAuth.$Infer.Session.user | null;
    session: typeof bAuth.$Infer.Session.session | null;
  };
}>();

auth.use('*', async (c, next) => {
  const session = await bAuth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    await next();
    return;
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});

auth.on(['POST', 'GET'], '/*', (c) => bAuth.handler(c.req.raw));
