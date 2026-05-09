// see more https://www.better-auth.com/docs/integrations/hono
//
// Intentionally no `getSession` middleware here. The PRD
// (tasks/auth-architecture-review.md §5) removed it because the redundant
// session lookup blocks sign-in when the DB is slow / under contention,
// and `/auth/*` routes don't need session context — better-auth's handler
// resolves session state internally. Authenticated routes (/v1/*) get
// session via `authMiddleware`.

import { auth as bAuth } from '@pack/auth/server';
import { Hono } from 'hono';

export const auth = new Hono();

auth.on(['POST', 'GET'], '/*', (c) => bAuth.handler(c.req.raw));
