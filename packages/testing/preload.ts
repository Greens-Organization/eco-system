import { setTestEnv } from './index.ts';

/**
 * bun:test preload — runs once before any test file (root `bunfig.toml`
 * `[test].preload`). Keeps the env deterministic and observability OFF by
 * default so suites run in no-op mode (no Sentry/OTel exporters). Opt in
 * per-test by setting the vars explicitly.
 */
setTestEnv();

// Marker so suites can assert the shared preload actually ran (runner.test.ts).
(globalThis as Record<string, unknown>).__ECO_TEST_PRELOAD__ = true;
