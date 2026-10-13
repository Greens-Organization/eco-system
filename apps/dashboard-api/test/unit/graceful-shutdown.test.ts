import { describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import {
  crashReason,
  createCrashHandler,
  drain,
  exitCodeFor,
  isDevReload,
  replaceProcessHandlers,
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

describe('isDevReload', () => {
  test('--hot and --watch reload on save; a plain run does not', () => {
    expect(isDevReload(['--hot'])).toBe(true);
    expect(isDevReload(['--watch'])).toBe(true);
    expect(isDevReload([])).toBe(false);
  });
});

describe('crashReason', () => {
  test("keeps a failed import's message (Bun's ResolveMessage is circular)", async () => {
    // A variable, so the type checker does not try to resolve it either.
    const missing = '#nope/missing';
    const reason = await import(missing).catch((e: unknown) => e);
    const { err } = crashReason(reason);
    expect(err.message).toContain("Cannot find package '#nope'");
    // pino has to be able to write it.
    expect(() => JSON.stringify(err)).not.toThrow();
  });

  test('an Error keeps its type and stack; anything else becomes a string', () => {
    const { err } = crashReason(new TypeError('boom'));
    expect(err).toMatchObject({ type: 'TypeError', message: 'boom' });
    expect(err.stack).toContain('boom');
    expect(crashReason('nope').err).toEqual({
      type: 'string',
      message: 'nope',
    });
  });
});

describe('createCrashHandler', () => {
  const handlerWith = (devReload: boolean, shuttingDown = false) => {
    const calls: string[] = [];
    const handle = createCrashHandler({
      label: 'Unhandled rejection',
      signal: 'UNHANDLED_REJECTION',
      devReload,
      isShuttingDown: () => shuttingDown,
      shutdown: async (signal) => {
        calls.push(signal);
      },
    });
    return { handle, calls };
  };

  test('in production a crash drains (and so exits 1)', () => {
    const { handle, calls } = handlerWith(false);
    handle(new Error('boom'));
    expect(calls).toEqual(['UNHANDLED_REJECTION']);
  });

  test('under --hot/--watch it only logs: the database and Redis stay open', () => {
    const { handle, calls } = handlerWith(true);
    handle(new Error('half-saved file'));
    expect(calls).toEqual([]);
  });

  test('a crash during a drain does not start another', () => {
    const { handle, calls } = handlerWith(false, true);
    handle(new Error('boom'));
    expect(calls).toEqual([]);
  });
});

describe('replaceProcessHandlers', () => {
  test("a reload's handlers replace the previous run's, once ones too", () => {
    const target = new EventEmitter();
    const fired: string[] = [];
    replaceProcessHandlers(
      {
        once: [['stop', () => fired.push('stop:run1')]],
        on: [['crash', () => fired.push('crash:run1')]],
      },
      target
    );
    // --hot re-ran the module: a second registration.
    replaceProcessHandlers(
      {
        once: [['stop', () => fired.push('stop:run2')]],
        on: [['crash', () => fired.push('crash:run2')]],
      },
      target
    );
    expect(target.listenerCount('stop')).toBe(1);
    expect(target.listenerCount('crash')).toBe(1);

    target.emit('crash');
    target.emit('crash');
    target.emit('stop');
    target.emit('stop');
    expect(fired).toEqual(['crash:run2', 'crash:run2', 'stop:run2']);

    replaceProcessHandlers({}, target);
    expect(target.listenerCount('crash')).toBe(0);
  });
});
