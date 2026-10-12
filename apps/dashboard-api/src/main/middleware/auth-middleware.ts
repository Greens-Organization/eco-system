import { auth } from '@pack/auth/server';
import { createMiddleware } from 'hono/factory';
import { OpenStatusApiError } from '@/main/infra/openapi/utils';
import { handlerRoute } from './observability';

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

/**
 * Middleware de autenticação para rotas protegidas
 * Valida sessão do Better Auth e injeta user/session no contexto
 */
export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    // Nothing handles this path: let it fall through to a 404 rather than
    // answer 401 for a route that does not exist.
    if (!handlerRoute(c)) return next();

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      throw new OpenStatusApiError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in.',
      });
    }

    c.set('user', session.user);
    c.set('session', session.session);

    await next();
  }
);
