import { describe, expect, test } from 'bun:test';
import {
  drain,
  exitCodeFor,
  shouldRegisterGracefulShutdown,
} from '../../src/main/infra/graceful-shutdown';

describe('shouldRegisterGracefulShutdown (regression for the prod bug, D5)', () => {
  test('registers in ALL environments unless explicitly skipped', () => {
    // Prior bug: `(isLocal || isDevelopment) && SKIP_GRACEFUL` meant production
    // never registered the handler (and the flag was inverted). Fixed: register
    // unless SKIP_GRACEFUL. Production (skip=false) MUST register.
    expect(shouldRegisterGracefulShutdown({ skip: false })).toBe(true);
    expect(shouldRegisterGracefulShutdown({ skip: true })).toBe(false);
  });
});

describe('drain', () => {
  test('closes things in order, and only after the server has stopped', async () => {
    const order: string[] = [];
    let releaseServer = () => {};
    const serverStopped = new Promise<void>((resolve) => {
      releaseServer = resolve;
    });

    const draining = drain(
      {
        stopServer: async () => {
          order.push('stop:start');
          await serverStopped;
          order.push('stop:done');
        },
        closeDatabase: async () => {
          order.push('db');
        },
        closeCache: () => {
          order.push('cache');
        },
        flushObservability: async () => {
          order.push('otel');
        },
      },
      {
        gracePeriod: 3000,
        sleep: async (ms) => {
          order.push(`grace:${ms}`);
        },
      }
    );

    // An in-flight request is still running: nothing else may close yet.
    await Bun.sleep(5);
    expect(order).toEqual(['grace:3000', 'stop:start']);

    releaseServer();
    await draining;
    expect(order).toEqual([
      'grace:3000',
      'stop:start',
      'stop:done',
      'db',
      'cache',
      'otel',
    ]);
  });
});

describe('exitCodeFor', () => {
  test('a requested stop exits 0, a crash exits 1', () => {
    expect(exitCodeFor('SIGTERM')).toBe(0);
    expect(exitCodeFor('SIGINT')).toBe(0);
    expect(exitCodeFor('UNCAUGHT_EXCEPTION')).toBe(1);
    expect(exitCodeFor('UNHANDLED_REJECTION')).toBe(1);
  });
});
