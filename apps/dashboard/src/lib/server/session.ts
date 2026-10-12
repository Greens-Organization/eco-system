import { getCookieCache, getSessionCookie } from '@pack/auth/cookies';
import z from 'zod';
import type { AuthFetchResult } from '$lib/auth-proxy';

const SessionPayloadSchema = z.object({
  session: z.looseObject({
    id: z.string(),
    userId: z.string(),
    expiresAt: z.coerce.date(),
  }),
  user: z.looseObject({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    image: z.string().nullish(),
  }),
});

type SessionPayload = z.infer<typeof SessionPayloadSchema>;

export type ResolvedSession =
  | ({ kind: 'cached' } & SessionPayload)
  /** The cookie cache was stale; `setCookie` carries the fresh one. */
  | ({ kind: 'refreshed'; setCookie: string[] } & SessionPayload)
  /** `staleCookies`: a session token was sent but the API rejected it. */
  | { kind: 'anonymous'; staleCookies: boolean }
  | { kind: 'unavailable'; reason: string };

export type SessionDeps = {
  secret: string;
  /** GET `/auth/get-session` on the API with the given Cookie header. */
  fetchSession: (cookieHeader: string) => Promise<AuthFetchResult>;
};

/**
 * The cookie cache (`session_data`) is signed and short-lived (5 min); the
 * session token outlives it. A cache hit costs nothing. On a miss with a token
 * present, the API revalidates the session against the DB and answers with a
 * fresh `session_data` cookie, which the caller must forward to the browser —
 * otherwise every request after the 5 minutes misses again.
 */
export async function resolveSession(
  request: Request,
  deps: SessionDeps
): Promise<ResolvedSession> {
  const cached = await getCookieCache(request, { secret: deps.secret });
  if (cached) {
    const parsed = SessionPayloadSchema.safeParse(cached);
    if (parsed.success) return { kind: 'cached', ...parsed.data };
  }

  if (getSessionCookie(request) === null) {
    return { kind: 'anonymous', staleCookies: false };
  }

  const result = await deps.fetchSession(request.headers.get('cookie') ?? '');
  if (!result.ok) return { kind: 'unavailable', reason: result.kind };

  const { response } = result;
  if (!response.ok) {
    return { kind: 'unavailable', reason: `get-session ${response.status}` };
  }

  // better-auth answers 200 + `null` for an unknown or revoked token.
  const body: unknown = await response.json().catch(() => null);
  const parsed = SessionPayloadSchema.safeParse(body);
  if (!parsed.success) return { kind: 'anonymous', staleCookies: true };

  return {
    kind: 'refreshed',
    setCookie: response.headers.getSetCookie(),
    ...parsed.data,
  };
}
