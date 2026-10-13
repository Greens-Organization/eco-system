import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { db, traced } from '@pack/db';
import { user } from '@pack/db/schema';
import { AppError } from '@pack/observability/errors';
import { eq } from 'drizzle-orm';
import type { Variables } from '..';
import { meSchemaRes } from './schema';

export const getMeRoute = createRoute({
  tags: ['me'],
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: { 'application/json': { schema: meSchemaRes } },
      description: 'The signed-in user, read from the database',
    },
  },
});

/**
 * The example of a v1 route backed by the database: everything else in v1 is
 * mock data on purpose (the domain is whoever forks this template's). It
 * reads the user that `authMiddleware` resolved, through `traced` so the
 * query shows up in the request's trace.
 */
export const getMeHandler: RouteHandler<
  typeof getMeRoute,
  { Variables: Variables }
> = async (c) => {
  const id = c.get('user')?.id;
  if (!id)
    throw new AppError('UNAUTHORIZED', 'No user on an authenticated route');

  const [row] = await traced('SELECT', 'user', () =>
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1)
  );
  // The session outlived its user (deleted meanwhile).
  if (!row) throw new AppError('NOT_FOUND', 'User not found');

  return c.json({ ...row, createdAt: row.createdAt.toISOString() }, 200);
};
