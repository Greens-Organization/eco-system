import { describe, expect, test } from 'bun:test';
import {
  generateSupportId,
  getContext,
  parseCfRay,
  runWithContext,
  setContext,
} from '../context';

describe('generateSupportId', () => {
  test('format is SUP- + 12 uppercase hex chars', () => {
    expect(generateSupportId()).toMatch(/^SUP-[0-9A-F]{12}$/);
  });

  test('is reasonably unique', () => {
    expect(generateSupportId()).not.toBe(generateSupportId());
  });
});

describe('parseCfRay', () => {
  test('keeps the part before the POP code', () => {
    expect(parseCfRay('7f3a2b1c9d0e1234-GRU')).toBe('7f3a2b1c9d0e1234');
  });

  test('returns the whole value when there is no dash', () => {
    expect(parseCfRay('7f3a2b1c9d0e1234')).toBe('7f3a2b1c9d0e1234');
  });

  test('returns undefined for missing/empty header', () => {
    expect(parseCfRay(undefined)).toBeUndefined();
    expect(parseCfRay('')).toBeUndefined();
  });
});

describe('request context (ALS)', () => {
  test('getContext is undefined outside a request', () => {
    expect(getContext()).toBeUndefined();
  });

  test('setContext is a no-op outside a request (does not throw)', () => {
    expect(() => setContext({ route: '/nope' })).not.toThrow();
    expect(getContext()).toBeUndefined();
  });

  test('runWithContext scopes the context; setContext merges incl. business fields', () => {
    const out = runWithContext(
      { request_id: 'r1', support_id: 'SUP-ABC' },
      () => {
        setContext({ route: '/users', status_code: 200, praca_id: 7 });
        return getContext();
      }
    );
    expect(out?.request_id).toBe('r1');
    expect(out?.support_id).toBe('SUP-ABC');
    expect(out?.route).toBe('/users');
    expect(out?.status_code).toBe(200);
    expect(out?.praca_id).toBe(7);
  });

  test('context propagates across awaits and does not leak after', async () => {
    const seen = await runWithContext(
      { request_id: 'r2', support_id: 'SUP-XYZ' },
      async () => {
        await Promise.resolve();
        return getContext()?.request_id;
      }
    );
    expect(seen).toBe('r2');
    expect(getContext()).toBeUndefined();
  });
});
