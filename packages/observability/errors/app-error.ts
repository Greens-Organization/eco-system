import { BaseError } from './base-error';
import {
  defaultClassification,
  type ErrorClassification,
} from './classification';
import type { ErrorCode } from './error-code';
import { codeToStatus } from './utils';

export interface AppErrorOptions {
  /** Stable code for grouping/alerting (e.g. USER_NOT_FOUND). Defaults to the ErrorCode. */
  errorCode?: string;
  /** Classification that decides Sentry routing. Defaults from the statusCode. */
  classification?: ErrorClassification;
  /** Functional/technical category (e.g. integration_error). */
  eventCategory?: string;
  /** Safe message shown to the user; `message` stays internal. */
  userMessage?: string;
  cause?: BaseError;
  context?: Record<string, unknown>;
}

/**
 * Framework-agnostic application error. Carries everything the central error
 * handler needs to log structured, decide Sentry routing, and shape the
 * response body (see tasks/todo/observability.md §4, D3).
 */
export class AppError extends BaseError {
  public readonly name: string = 'AppError';
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly classification: ErrorClassification;
  public readonly eventCategory?: string;
  public readonly userMessage?: string;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super({ message, cause: options.cause, context: options.context });
    this.code = code;
    this.statusCode = codeToStatus(code);
    this.errorCode = options.errorCode ?? code;
    this.classification =
      options.classification ?? defaultClassification(this.statusCode);
    this.eventCategory = options.eventCategory;
    this.userMessage = options.userMessage;
  }
}
