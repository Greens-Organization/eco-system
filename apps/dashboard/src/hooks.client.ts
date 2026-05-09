import type { HandleClientError } from '@sveltejs/kit';
import { log } from '$lib/logger';

/**
 * Catch unhandled errors thrown during client-side navigation,
 * load functions, and component lifecycles. Stamps an `errorId`
 * so it correlates with whatever the user sees in +error.svelte.
 */
export const handleError: HandleClientError = ({ error, event, status }) => {
  const errorId = crypto.randomUUID();
  log.error(
    {
      err: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      path: event.url.pathname,
      status,
      errorId,
    },
    'unhandled'
  );
  return {
    message:
      error instanceof Error ? error.message : 'An unexpected error occurred.',
    errorId,
  };
};
