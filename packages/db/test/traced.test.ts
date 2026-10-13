import { describe, expect, test } from 'bun:test';
import { traced } from '../src/traced';

// Without an OTel SDK (as here) the span is a no-op: traced must still be a
// transparent wrapper around the query. A real drizzle query builder goes
// through it in the /v1/me e2e test.
describe('traced', () => {
  test('returns what the query resolves to', async () => {
    expect(await traced('SELECT', 'user', async () => [{ id: '1' }])).toEqual([
      { id: '1' },
    ]);
  });

  test('rethrows the query error', async () => {
    await expect(
      traced('INSERT', 'user', async () => {
        throw new Error('duplicate key');
      })
    ).rejects.toThrow('duplicate key');
  });
});
