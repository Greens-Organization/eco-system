import { describe, expect, test } from 'bun:test';

process.env.SMTP_FROM ??= 'test@eco.local';
const { schema } = await import('../pack-env');

const base = { SMTP_FROM: 'app@eco.local' };

describe('@pack/email pack-env schema', () => {
  test('SMTP is optional as a whole', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  // `.env` files carry unset values as `KEY=`.
  test('empty strings read as unset', () => {
    const parsed = schema.parse({ ...base, SMTP_HOST: '', SMTP_PORT: '' });
    expect(parsed.SMTP_HOST).toBeUndefined();
    expect(parsed.SMTP_PORT).toBeUndefined();
  });

  // It used to parse, then send with `port: NaN` on the first email.
  test('a host without a port is refused at startup', () => {
    expect(schema.safeParse({ ...base, SMTP_HOST: 'smtp.test' }).success).toBe(
      false
    );
    expect(
      schema.parse({ ...base, SMTP_HOST: 'smtp.test', SMTP_PORT: '587' })
        .SMTP_PORT
    ).toBe(587);
  });

  test('a port must be a real port number', () => {
    for (const SMTP_PORT of ['0', '70000', 'abc']) {
      expect(
        schema.safeParse({ ...base, SMTP_HOST: 'smtp.test', SMTP_PORT }).success
      ).toBe(false);
    }
  });
});
