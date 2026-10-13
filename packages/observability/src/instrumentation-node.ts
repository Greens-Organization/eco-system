import * as Sentry from '@sentry/node';
import { startObservability } from './telemetry';

/**
 * Observability preload for Node (the dashboard's adapter-node build, loaded
 * by SvelteKit's `instrumentation.server.ts` before the app).
 */
startObservability(Sentry);

export { FLUSH_BUDGET_MS, shutdownObservability } from './telemetry';
