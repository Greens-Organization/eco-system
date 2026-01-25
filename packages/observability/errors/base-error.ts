import util from 'node:util';
import type { ErrorCode } from './error-code';

type ErrorContext = Record<string, unknown>;

export abstract class BaseError<
  TContext extends ErrorContext = ErrorContext,
> extends Error {
  public abstract override readonly name: string;
  /**
   * A distinct code for the error type used to differentiate between different types of errors.
   * Used to build the URL for the error documentation.
   * @example 'UNAUTHORIZED' | 'INTERNAL_SERVER_ERROR'
   */
  public abstract readonly code?: ErrorCode;
  public override readonly cause?: BaseError;
  /**
   * Additional context to help understand the error.
   * @example { url: 'https://example.com/api', method: 'GET', statusCode: 401 }
   */
  public readonly context?: TContext;

  constructor(opts: {
    message: string;
    cause?: BaseError;
    context?: TContext;
  }) {
    super(opts.message);
    this.cause = opts.cause;
    this.context = opts.context;

    // TODO: add logger here!
  }

  // Using util from node instead bun, because bun does not support vitest esbuild yet.
  // https://github.com/oven-sh/bun/issues/4145
  [util.inspect.custom]() {
    let result = `${this.name}(${this.code}): ${this.message}`;

    if (this.context && Object.keys(this.context).length > 0) {
      result += ` - context: ${JSON.stringify(this.context)}`;
    }

    if (this.cause) {
      result += ` - caused by: ${this.cause.toString()}`;
    }

    return result;
  }
}
