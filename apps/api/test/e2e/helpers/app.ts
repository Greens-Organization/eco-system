import { buildApp } from '@/main/app';

export type TestApp = ReturnType<typeof buildApp>;

/**
 * Fresh app instance for a test. Thin wrapper over `buildApp()` so future test
 * overrides (rate-limit, feature flags) have a single seam.
 */
export function buildTestApp(): TestApp {
  return buildApp();
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Cookie header value (e.g. the session cookie from `authenticate()`). */
  cookie?: string;
}

/**
 * Issue a request against a test app via Hono's `app.request`. JSON-encodes the
 * body and attaches the auth cookie when given.
 */
export async function request(
  app: TestApp,
  path: string,
  opts: RequestOptions = {}
): Promise<Response> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (opts.cookie) {
    headers.cookie = opts.cookie;
  }
  return app.request(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}
