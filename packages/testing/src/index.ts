/**
 * @pack/testing — shared bun:test helpers: a deterministic test environment
 * (observability off, logs silent). Add a mock here only once a package
 * actually needs it.
 */

/**
 * Force a clean, deterministic test environment:
 *   - NODE_ENV=test (unless already set)
 *   - observability exporters OFF (delete SENTRY_DSN / OTEL endpoint) so the
 *     instrumentation guard stays no-op unless a test opts in explicitly
 *   - LOG_LEVEL=silent (unless set): the error paths under test log at
 *     warn/error, and that output buried real failures. A test that asserts
 *     on logs builds its own logger over a capture stream.
 */
export function setTestEnv(): void {
  process.env.NODE_ENV ??= 'test';
  process.env.LOG_LEVEL ??= 'silent';
  delete process.env.SENTRY_DSN;
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
}
