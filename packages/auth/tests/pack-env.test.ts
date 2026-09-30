import { describe, expect, test } from 'bun:test';

// `pack-env` (and the `@pack/db` schema it spreads) parses `process.env` at
// module load, so the required vars must exist before it is evaluated.
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/eco_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-not-for-prod';
process.env.ORIGIN_ALLOWED ??= 'http://localhost:3000';
const { schema } = await import('../pack-env');

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/eco',
  BETTER_AUTH_SECRET: 'secret',
  ORIGIN_ALLOWED: 'http://localhost:3000',
};

describe('@pack/auth pack-env schema', () => {
  test('ORIGIN_ALLOWED splits on comma and trims each origin', () => {
    expect(
      schema.parse({
        ...base,
        ORIGIN_ALLOWED: 'http://a.test, http://b.test ,http://c.test',
      }).ORIGIN_ALLOWED
    ).toEqual(['http://a.test', 'http://b.test', 'http://c.test']);
  });

  test('a single origin still becomes a one-element array', () => {
    expect(schema.parse(base).ORIGIN_ALLOWED).toEqual([
      'http://localhost:3000',
    ]);
  });

  test('ORIGIN_ALLOWED is required; an empty string yields one empty origin', () => {
    expect(
      schema.safeParse({ ...base, ORIGIN_ALLOWED: undefined }).success
    ).toBe(false);
    expect(
      schema.parse({ ...base, ORIGIN_ALLOWED: '' }).ORIGIN_ALLOWED
    ).toEqual(['']);
  });

  test('BETTER_AUTH_URL defaults to the local API, BETTER_AUTH_SECRET does not', () => {
    expect(schema.parse(base).BETTER_AUTH_URL).toBe('http://localhost:3002/');
    expect(
      schema.parse({ ...base, BETTER_AUTH_URL: 'https://api.test' })
        .BETTER_AUTH_URL
    ).toBe('https://api.test');
    expect(schema.safeParse({ ...base, BETTER_AUTH_SECRET: '' }).success).toBe(
      false
    );
  });

  test('inherits the @pack/db keys it spreads', () => {
    const parsed = schema.parse({ ...base, DRIZZLE_SQL_LOGS: 'yes' });
    expect(parsed.DATABASE_URL).toBe(base.DATABASE_URL);
    expect(parsed.DRIZZLE_SQL_LOGS).toBe(true);
    expect(schema.safeParse({ ...base, DATABASE_URL: 'nope' }).success).toBe(
      false
    );
  });
});
