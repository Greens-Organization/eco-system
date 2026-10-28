import {
  AppError,
  defaultClassification,
  type ErrorClassification,
  type ErrorCode,
  SchemaError,
  shouldReportToSentry,
  statusToCode,
} from '@pack/observability/errors';
import { log } from '@pack/observability/logger';
import { captureError } from '@pack/observability/sentry';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import type { AppVariables } from '../middleware';
import { type ErrorSchema, OpenStatusApiError } from './openapi';

type AppContext = Context<{ Variables: AppVariables }>;

/**
 * Central error pipeline (CTO contract):
 *   error -> classify -> log structured (always)
 *         -> business/validation: stop here (no Sentry)
 *         -> technical/critical/unknown: Sentry.captureException + 5xx
 *         -> response carries support_id (user sees it / forwards to support)
 */
export function handleError(err: Error, c: AppContext): Response {
  const ctx = c.get('obsContext');
  const requestId = ctx?.request_id ?? c.get('requestId');
  const supportId = ctx?.support_id;
  const route = ctx?.route;
  const path = c.req.path;
  const method = c.req.method;

  const body = (code: ErrorCode, message: string): ErrorSchema => ({
    code,
    message,
    requestId,
    ...(supportId ? { support_id: supportId } : {}),
  });

  const fieldsFor = (
    code: string,
    classification: ErrorClassification,
    status: number
  ) => ({
    request_id: requestId,
    support_id: supportId,
    error_code: code,
    classification,
    route,
    path,
    method,
    status_code: status,
  });

  // Zod validation -> validation_error, never Sentry
  if (err instanceof ZodError) {
    const schemaError = SchemaError.fromZod(err);
    const fields = fieldsFor(
      schemaError.code,
      schemaError.classification,
      schemaError.statusCode
    );
    log.warn('{error_message}', {
      ...fields,
      error_message: schemaError.message,
    });
    return c.json<ErrorSchema>(
      body(schemaError.code, schemaError.message),
      schemaError.statusCode as ContentfulStatusCode
    );
  }

  // AppError -> classification decides Sentry
  if (err instanceof AppError) {
    const fields = fieldsFor(err.errorCode, err.classification, err.statusCode);
    const logged = { ...fields, error_message: err.message, err };
    if (err.statusCode >= 500) log.error('{error_message}', logged);
    else log.warn('{error_message}', logged);
    if (shouldReportToSentry(err.classification)) captureError(err, fields);
    // Never leak the internal message on 5xx; business errors keep theirs.
    const message =
      err.userMessage ??
      (err.statusCode >= 500 ? 'Internal Server Error' : err.message);
    return c.json<ErrorSchema>(
      body(err.code, message),
      err.statusCode as ContentfulStatusCode
    );
  }

  // OpenStatusApiError / HTTPException -> mapped status, classified by status
  if (err instanceof HTTPException) {
    const status = err.status;
    const code =
      err instanceof OpenStatusApiError ? err.code : statusToCode(status);
    const classification = defaultClassification(status);
    const fields = fieldsFor(code, classification, status);
    const logged = { ...fields, error_message: err.message, err };
    if (status >= 500) log.error('{error_message}', logged);
    else log.warn('{error_message}', logged);
    if (shouldReportToSentry(classification)) captureError(err, fields);
    // Same rule as AppError: a 5xx message is internal and stays in the log.
    const message = status >= 500 ? 'Internal Server Error' : err.message;
    return c.json<ErrorSchema>(body(code, message), status);
  }

  // Unknown -> 500 technical
  const status = 500;
  const code = statusToCode(status);
  const fields = fieldsFor(code, 'technical_error', status);
  log.error('Request error', {
    ...fields,
    err: { name: err.name, message: err.message, stack: err.stack },
  });
  if (shouldReportToSentry('technical_error')) captureError(err, fields);
  return c.json<ErrorSchema>(
    body(code, 'Internal Server Error'),
    status as ContentfulStatusCode
  );
}
