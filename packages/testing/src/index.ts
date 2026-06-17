/**
 * @pack/testing — shared bun:test helpers.
 *
 * Today: a deterministic test environment (observability OFF by default).
 *
 * Mock factories land here as their deps arrive. Keep speculative mocks OUT
 * until the package they mock is an actual dependency:
 *   - Fase 2: `@sentry/bun` mock (captureException / getClient / init / close)
 *   - Fase 1/2: db client mock (db.raw -> SELECT 1)
 *   - fixtures: RequestContext / AppError builders
 *
 * See tasks/todo/observability.md (D9/D10).
 */

/**
 * Force a clean, deterministic test environment:
 *   - NODE_ENV=test (unless already set)
 *   - observability exporters OFF (delete SENTRY_DSN / OTEL endpoint) so the
 *     instrumentation guard stays no-op unless a test opts in explicitly.
 */
export function setTestEnv(): void {
  process.env.NODE_ENV ??= 'test';
  delete process.env.SENTRY_DSN;
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
}
