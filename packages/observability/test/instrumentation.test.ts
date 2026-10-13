import { describe, expect, test } from 'bun:test';
import { settleWithin } from '../src/settle';

/**
 * `instrumentation.ts` reads env at import and wires the OTel SDKs as a side
 * effect, gated on OTEL_EXPORTER_OTLP_ENDPOINT / SENTRY_DSN. That can't be
 * toggled per-test in-process (env is frozen at module load), so each case runs
 * the module in a fresh subprocess with a controlled env and reports the
 * observable global-provider state. See ./fixtures/instrumentation-probe.ts.
 */
const PROBE = `${import.meta.dir}/fixtures/instrumentation-probe.ts`;

type ProbeResult = {
  meterProvider: string;
  loggerProvider: string;
  shutdownOk: boolean;
};

async function runProbe(env: Record<string, string>): Promise<ProbeResult> {
  const proc = Bun.spawn(['bun', PROBE], {
    // Start from a clean default-off env, then let the case override.
    env: {
      ...process.env,
      OTEL_EXPORTER_OTLP_ENDPOINT: '',
      SENTRY_DSN: '',
      ...env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  const last = out.trim().split('\n').filter(Boolean).pop() ?? '{}';
  return JSON.parse(last);
}

describe('instrumentation — default-off (no exporters)', () => {
  test('registers no real providers and shutdown resolves cleanly', async () => {
    const r = await runProbe({});
    // Default global providers stay (Noop/Proxy) — the real SDK providers are
    // only ever installed by the OTLP-enabled branch.
    expect(r.meterProvider).not.toBe('MeterProvider');
    expect(r.loggerProvider).not.toBe('LoggerProvider');
    expect(r.shutdownOk).toBe(true);
  }, 20000);
});

describe('instrumentation — OTLP enabled', () => {
  test('registers real meter + logger providers and shutdown resolves', async () => {
    // Unreachable endpoint on purpose: we assert provider *registration* (the
    // env gate), not export success — shutdown stays best-effort regardless.
    const r = await runProbe({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:14318',
    });
    expect(r.meterProvider).toBe('MeterProvider');
    expect(r.loggerProvider).toBe('LoggerProvider');
    expect(r.shutdownOk).toBe(true);
  }, 20000);
});

describe('settleWithin', () => {
  test('waits for tasks that finish in time', async () => {
    let done = false;
    await settleWithin([Bun.sleep(5).then(() => (done = true))], 1000);
    expect(done).toBe(true);
  });

  // An OTLP exporter with the collector down never settles in time; the
  // graceful shutdown used to hang on it until its 10 s kill switch.
  test('gives up on a task that hangs, at the deadline', async () => {
    const t0 = performance.now();
    await settleWithin([new Promise(() => {}), Bun.sleep(5)], 50);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  test('a failing task does not throw', async () => {
    await settleWithin([Promise.reject(new Error('boom')), undefined], 50);
  });
});
