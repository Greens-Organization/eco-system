import { describe, expect, test } from 'bun:test';
import { shouldRegisterGracefulShutdown } from '../../src/main/infra/graceful-shutdown';

describe('shouldRegisterGracefulShutdown (regression for the prod bug, D5)', () => {
  test('registers in ALL environments unless explicitly skipped', () => {
    // Prior bug: `(isLocal || isDevelopment) && SKIP_GRACEFUL` meant production
    // never registered the handler (and the flag was inverted). Fixed: register
    // unless SKIP_GRACEFUL. Production (skip=false) MUST register.
    expect(shouldRegisterGracefulShutdown({ skip: false })).toBe(true);
    expect(shouldRegisterGracefulShutdown({ skip: true })).toBe(false);
  });
});
