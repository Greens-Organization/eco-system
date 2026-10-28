import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Request context propagated via AsyncLocalStorage.
 *
 * Holds the per-request fields of the log contract EXCEPT `trace_id`/`span_id`,
 * which come from the active OTel span (read by the logger). Business/feature
 * fields are open (`[key: string]`) — domains attach their own via setContext().
 */
export interface RequestContext {
  request_id: string;
  support_id: string;
  cf_ray_id?: string;
  /** Route pattern of the handler (`/v1/customers/:id`), for grouping. */
  route?: string;
  /** The concrete request path (`/v1/customers/42`). */
  path?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  ip?: string;
  user_agent?: string;
  [key: string]: unknown;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** The store behind the request context; the logger reads it on every record. */
export const requestContextStorage = storage;

/** Current request context (undefined outside a request). */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Run `fn` with `ctx` as the active request context for the whole async
 * subtree. Hono middleware wraps `next()` with this — unlike the Fastify
 * source's `enterWith`, `run` scopes the context to the request and never
 * leaks across requests.
 */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Merge fields into the current context (no-op outside a request). */
export function setContext(patch: Partial<RequestContext>): void {
  const store = storage.getStore();
  if (store) Object.assign(store, patch);
}

/** Support-facing id, shown to the user and sent to Sentry. */
export function generateSupportId(): string {
  return `SUP-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

/**
 * Extract `cf_ray_id` from the `CF-Ray` header, keeping only the part before
 * the `-` (drops the POP code, e.g. `7f3a2b1c9d0e1234-GRU` -> `7f3a2b1c9d0e1234`).
 */
export function parseCfRay(header: string | undefined): string | undefined {
  if (!header) return undefined;
  return header.split('-')[0];
}
