import * as Sentry from '@sentry/bun';
import { startObservability } from './telemetry';

/**
 * Observability preload for Bun (the API) — imported first by the entrypoint
 * so the SDKs are live before the first request.
 */
startObservability(Sentry);

export { FLUSH_BUDGET_MS, shutdownObservability } from './telemetry';
