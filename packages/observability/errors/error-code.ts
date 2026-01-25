import { z } from 'zod';

/**
 * @docs https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#client_error_responses
 */
export const ErrorCodes = [
  'BAD_REQUEST',
  'FORBIDDEN',
  'INTERNAL_SERVER_ERROR',
  'PAYMENT_REQUIRED',
  'CONFLICT',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'METHOD_NOT_ALLOWED',
  'UNPROCESSABLE_ENTITY',
] as const;

export const ErrorCodeEnum = z.enum(ErrorCodes);

export type ErrorCode = z.infer<typeof ErrorCodeEnum>;
