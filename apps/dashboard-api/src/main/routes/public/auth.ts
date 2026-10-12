// see more https://www.better-auth.com/docs/integrations/hono
//
// Intentionally no `getSession` middleware here. The PRD
// (tasks/auth-architecture-review.md §5) removed it because the redundant
// session lookup blocks sign-in when the DB is slow / under contention,
// and `/auth/*` routes don't need session context — better-auth's handler
// resolves session state internally. Authenticated routes (/v1/*) get
// session via `authMiddleware`.

import {
  CLIENT_IP_HEADER,
  stripUnverifiedClientIp,
} from '@pack/auth/client-ip';
import { auth as bAuth } from '@pack/auth/server';
import { setContext } from '@pack/observability/context';
import { log } from '@pack/observability/logger';
import { Hono } from 'hono';
import { env } from '@/core/env';

export const auth = new Hono();

// better-auth keys its rate limits on the client IP header. Only a header the
// dashboard signed gets through; anything else is dropped, so the request
// falls into the shared "no trusted IP" bucket instead of picking its own key.
auth.on(['POST', 'GET'], '/*', (c) => {
  const { verified, claimed } = stripUnverifiedClientIp(
    c.req.raw,
    env.CLIENT_IP_SECRET
  );
  if (verified) {
    // Log lines from here on carry the browser's IP, not the dashboard's.
    setContext({ ip: c.req.raw.headers.get(CLIENT_IP_HEADER) ?? undefined });
  } else if (claimed) {
    log.warn({ path: c.req.path }, 'auth.client_ip.rejected');
  }
  return bAuth.handler(c.req.raw);
});
