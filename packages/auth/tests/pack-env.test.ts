import { describe, expect, test } from 'bun:test';

// `pack-env` (and the `@pack/db` schema it spreads) parses `process.env` at
// module load, so the required vars must exist before it is evaluated.
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/eco_test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-not-for-prod-0123456789';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.ORIGIN_ALLOWED ??= 'http://localhost:3000';
process.env.SMTP_FROM ??= 'test@eco.local';
process.env.CLIENT_IP_SECRET ??= 'test-client-ip-secret-not-for-prod-0123';
const { schema } = await import('../pack-env');

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/eco',
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 's'.repeat(32),
  CLIENT_IP_SECRET: 'x'.repeat(32),
  ORIGIN_ALLOWED: 'http://localhost:3000',
  SMTP_FROM: 'app@eco.local',
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

  test('ORIGIN_ALLOWED needs at least one real origin', () => {
    for (const ORIGIN_ALLOWED of [undefined, '', ' , ', 'not-a-url']) {
      expect(schema.safeParse({ ...base, ORIGIN_ALLOWED }).success).toBe(false);
    }
  });

  test('BETTER_AUTH_URL has no default; it must be a URL', () => {
    expect(
      schema.safeParse({ ...base, BETTER_AUTH_URL: undefined }).success
    ).toBe(false);
    expect(
      schema.parse({ ...base, BETTER_AUTH_URL: 'https://app.test' })
        .BETTER_AUTH_URL
    ).toBe('https://app.test');
  });

  // The old schema took any non-empty string, so the .env.example
  // placeholder "32-length" reached production as the signing secret.
  test('BETTER_AUTH_SECRET needs 32+ characters', () => {
    for (const BETTER_AUTH_SECRET of ['', '32-length', 's'.repeat(31)]) {
      expect(schema.safeParse({ ...base, BETTER_AUTH_SECRET }).success).toBe(
        false
      );
    }
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
