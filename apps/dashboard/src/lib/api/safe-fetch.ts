import type { ClientResponse } from 'hono/client';
import { ZodError, type ZodType } from 'zod';

/** The slice of a logger used here (`locals.log` in a load). */
type Log = {
  warn(message: string, properties?: Record<string, unknown>): void;
  error(message: string, properties?: Record<string, unknown>): void;
};

type Success<T> = { success: true; data: T };
type Failure = { success: false; error: string; status: number };
type Result<T> = Success<T> | Failure;

// Structural, not `Response`: the Hono client returns `ClientResponse`, which is
// not assignable to Bun's `Response` (it lacks `textStream`). This asks for the
// two members actually read, so either shape satisfies it.
async function failure(res: {
  status: number;
  json(): Promise<unknown>;
}): Promise<Failure> {
  let message = 'Internal server error';
  try {
    const json: unknown = await res.json();
    if (json && typeof json === 'object') {
      const rec = json as Record<string, unknown>;
      if (typeof rec.message === 'string') message = rec.message;
      else if (typeof rec.error === 'string') message = rec.error;
    }
  } catch {
    // body wasn't JSON — keep the generic message
  }
  return { success: false, error: message, status: res.status };
}

/**
 * Typed fetch wrapper over a Hono client call. Pass a Zod `schema` to validate
 * the response body at the boundary (guards against API/client type drift);
 * without one the body is trusted as `T` (the Hono client's declared type).
 *
 * Failures come back as values, never thrown — and every one is logged on
 * `log` with its cause, so a drifted schema or a dead API is not a silent
 * "Internal server error" on the page.
 */
export async function safeFetch<T>(
  request: Promise<ClientResponse<T>>,
  schema?: ZodType<T>,
  log?: Log
): Promise<Result<T>> {
  try {
    const res = await request;
    if (!res.ok) {
      const result = await failure(res);
      log?.warn('api.request.rejected', {
        status: result.status,
        error: result.error,
      });
      return result;
    }
    const body: unknown = await res.json();
    const data = schema ? schema.parse(body) : (body as T);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      log?.error('api.response.schema_mismatch', { issues: error.issues });
    } else {
      log?.error('api.request.failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    return { success: false, error: 'Internal server error', status: 500 };
  }
}
