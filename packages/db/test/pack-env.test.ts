import { describe, expect, test } from 'bun:test';

// `pack-env` parses `process.env` at module load, so the required vars must be
// in place before it is evaluated — hence the dynamic import.
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/eco_test';
const { schema } = await import('../pack-env');

const base = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/eco' };

describe('@pack/db pack-env schema', () => {
  test('requires DATABASE_URL and rejects a non-URL', () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ DATABASE_URL: 'not-a-url' }).success).toBe(false);
    expect(schema.safeParse(base).success).toBe(true);
  });

  test('DRIZZLE_SQL_LOGS accepts the declared truthy/falsy words', () => {
    for (const [input, expected] of [
      ['yes', true],
      ['true', true],
      ['no', false],
      ['false', false],
    ] as const) {
      const parsed = schema.parse({ ...base, DRIZZLE_SQL_LOGS: input });
      expect(parsed.DRIZZLE_SQL_LOGS).toBe(expected);
    }
  });

  test('DRIZZLE_SQL_LOGS rejects words outside that list', () => {
    expect(schema.safeParse({ ...base, DRIZZLE_SQL_LOGS: '1' }).success).toBe(
      false
    );
    expect(schema.safeParse({ ...base, DRIZZLE_SQL_LOGS: 'on' }).success).toBe(
      false
    );
  });

  test('DRIZZLE_SQL_LOGS defaults to false when absent', () => {
    expect(schema.parse(base).DRIZZLE_SQL_LOGS).toBe(false);
  });

  test('ADMIN_* are optional but validated when present', () => {
    expect(schema.parse(base).ADMIN_EMAIL).toBeUndefined();
    expect(
      schema.safeParse({ ...base, ADMIN_EMAIL: 'not-an-email' }).success
    ).toBe(false);
    expect(schema.safeParse({ ...base, ADMIN_PASSWORD: '' }).success).toBe(
      false
    );
    expect(schema.safeParse({ ...base, ADMIN_NAME: '' }).success).toBe(false);
    expect(
      schema.parse({ ...base, ADMIN_EMAIL: 'admin@example.com' }).ADMIN_EMAIL
    ).toBe('admin@example.com');
  });
});
