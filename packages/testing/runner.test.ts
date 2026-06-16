import { describe, expect, test } from 'bun:test';
import { setTestEnv } from './index.ts';

/**
 * Smoke test for the bun:test toolchain (D9). Proves three things:
 *   1. `bun test` runs TS suites in this monorepo.
 *   2. the shared `@pack/testing` env helper enforces its contract.
 *   3. the root `bunfig.toml [test].preload` actually fired for this run.
 */
describe('@pack/testing runner', () => {
  test('runs under bun:test', () => {
    expect(1 + 1).toBe(2);
  });

  test('setTestEnv forces observability OFF and NODE_ENV=test', () => {
    process.env.SENTRY_DSN = 'https://example@sentry.invalid/1';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    setTestEnv();

    expect(process.env.SENTRY_DSN).toBeUndefined();
    expect(process.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('shared preload ran before the suite', () => {
    expect((globalThis as Record<string, unknown>).__ECO_TEST_PRELOAD__).toBe(
      true
    );
  });
});
