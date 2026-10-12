import { describe, expect, test } from 'bun:test';
import { ACCOUNT_THROTTLE, waitAfter } from '../src/account-throttle';

describe('waitAfter', () => {
  test('the first five wrong passwords cost nothing', () => {
    for (let n = 0; n <= ACCOUNT_THROTTLE.freeAttempts; n++) {
      expect(waitAfter(n)).toBe(0);
    }
  });

  test('then the wait doubles: 2, 4, 8, 16 s', () => {
    expect([6, 7, 8, 9].map(waitAfter)).toEqual([2, 4, 8, 16]);
  });

  test('and stops growing at 20 minutes', () => {
    expect(waitAfter(16)).toBe(1200);
    expect(waitAfter(100)).toBe(1200);
  });

  // NIST 800-63B §3.2.2: at most 100 consecutive failures per account. The
  // counter lives for a day, so a day of guessing as fast as allowed (each
  // try waits out the previous one) must stay under 100.
  test('a full day of guessing stays under 100 tries', () => {
    let elapsed = 0;
    let failures = 0;
    while (elapsed < ACCOUNT_THROTTLE.windowSeconds) {
      failures++;
      elapsed += waitAfter(failures);
    }
    expect(failures).toBeLessThan(100);
  });
});
