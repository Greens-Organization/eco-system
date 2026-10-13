import { shutdownObservability } from '@pack/observability/instrumentation/node';

// Loaded by SvelteKit before the app (kit.experimental.instrumentation), so
// the OpenTelemetry providers and Sentry exist before the first request.
// adapter-node emits this once the server has stopped taking requests.
process.on('sveltekit:shutdown', () => {
  void shutdownObservability();
});
