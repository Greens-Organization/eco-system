// Props to Unkey: https://github.com/unkeyed/unkey/blob/main/apps/api/src/pkg/errors/http.ts

import { z } from '@hono/zod-openapi';
import {
  codeToStatus,
  type ErrorCode,
  ErrorCodes,
  SchemaError,
} from '@pack/observability/errors';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ZodError } from 'zod';

export class OpenStatusApiError extends HTTPException {
  public readonly code: ErrorCode;

  constructor({
    code,
    message,
  }: {
    code: ErrorCode;
    message: HTTPException['message'];
  }) {
    const status = codeToStatus(code);
    super(status, { message });
    this.code = code;
  }
}

export function handleZodError(
  result:
    | {
        success: true;
        data: unknown;
      }
    | {
        success: false;
        error: ZodError;
      },
  c: Context
) {
  if (!result.success) {
    const error = SchemaError.fromZod(result.error, c);
    return c.json<z.infer<ReturnType<typeof createErrorSchema>>>(
      {
        code: 'BAD_REQUEST',
        message: error.message,
        requestId: c.get('requestId'),
      },
      { status: 400 }
    );
  }
}

export function createErrorSchema(code: ErrorCode) {
  return z.object({
    code: z.enum(ErrorCodes).openapi({
      example: code,
      description: 'The error code related to the status code.',
    }),
    message: z.string().openapi({
      description: 'A human readable message describing the issue.',
      example: '<string>',
    }),
    requestId: z.string().openapi({
      description:
        'The request id to be used for debugging and error reporting.',
      example: '<uuid>',
    }),
  });
}

export type ErrorSchema = z.infer<ReturnType<typeof createErrorSchema>>;
