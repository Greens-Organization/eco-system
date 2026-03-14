import { SchemaError, statusToCode } from '@pack/observability/errors';
import { log } from '@pack/observability/logger';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { type ErrorSchema, OpenStatusApiError } from './openapi';

export function handleError(err: Error, c: Context): Response {
  if (err instanceof ZodError) {
    const error = SchemaError.fromZod(err, c);

    return c.json<ErrorSchema>(
      {
        code: 'BAD_REQUEST',
        message: error.message,
        requestId: c.get('requestId'),
      },
      { status: 400 }
    );
  }

  /**
   * This is a custom error that we throw in our code so we can handle it
   */
  if (err instanceof OpenStatusApiError) {
    const code = statusToCode(err.status);

    return c.json<ErrorSchema>(
      {
        code: code,
        message: err.message,
        requestId: c.get('requestId'),
      },
      { status: err.status }
    );
  }

  if (err instanceof HTTPException) {
    const code = statusToCode(err.status);
    return c.json<ErrorSchema>(
      {
        code: code,
        message: err.message,
        requestId: c.get('requestId'),
      },
      { status: err.status }
    );
  }

  log.error(
    {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      method: c.req.method,
      url: c.req.url,
    },
    'Request error'
  );

  return c.json<ErrorSchema>(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message ?? 'Something went wrong',
      requestId: c.get('requestId'),
    },
    { status: 500 }
  );
}
