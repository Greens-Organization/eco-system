import { mock } from 'bun:test';

/**
 * Replace `@pack/db` with an in-memory stub for UNIT tests that must not touch
 * a real database. Import this BEFORE the code under test — bun:test's
 * `mock.module` is not hoisted (unlike jest):
 *
 *   import { mockDb } from '../helpers/mock-db';
 *   mockDb();
 *   const { something } = await import('@/...');
 *
 * Most unit tests here use dependency injection (e.g. `createReadyRoute({ ping
 * })`) and don't need this; it's for units that import `@pack/db` directly.
 */
export function mockDb(overrides: Record<string, unknown> = {}): void {
  mock.module('@pack/db', () => ({
    db: {},
    disconnectDatabase: async () => {},
    pingDatabase: async () => {},
    ...overrides,
  }));
}
