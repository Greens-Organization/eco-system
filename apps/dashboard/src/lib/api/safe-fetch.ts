import type { ClientResponse } from 'hono/client';
import type { ZodType } from 'zod';

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
 */
export async function safeFetch<T>(
  request: Promise<ClientResponse<T>>,
  schema?: ZodType<T>
): Promise<Result<T>> {
  try {
    const res = await request;
    if (!res.ok) return failure(res);
    const body: unknown = await res.json();
    const data = schema ? schema.parse(body) : (body as T);
    return { success: true, data };
  } catch {
    return { success: false, error: 'Internal server error', status: 500 };
  }
}
