// see more https://www.better-auth.com/docs/integrations/hono

import { auth as bAuth } from '@pack/auth/server';
import { Hono } from 'hono';

export const auth = new Hono();

auth.on(['POST', 'GET'], '/*', (c) => bAuth.handler(c.req.raw));
