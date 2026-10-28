import type { HandleClientError } from '@sveltejs/kit/hooks';
import { log } from '#lib/logger.js';

/**
 * Catch errors thrown during client-side navigation, load functions and
 * component lifecycles. Stamps an `errorId` so it correlates with whatever
 * the user sees in +error.svelte. Only `unknown` errors are bugs; `app` and
 * `framework` ones (a 404, an `error(...)`) are expected.
 */
export const handleError: HandleClientError = ({ kind, error, event }) => {
  const errorId = crypto.randomUUID();
  if (kind === 'unknown') {
    log.error('unhandled', {
      err: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      path: event.url.pathname,
      errorId,
    });
  }
  return { errorId };
};
