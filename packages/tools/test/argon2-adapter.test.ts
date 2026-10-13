import { describe, expect, test } from 'bun:test';
import { argon2Adapter } from '../src/crypto/argon2-adapter';

describe('argon2Adapter', () => {
  test('hashes and verifies a password round-trip', async () => {
    const password = 'correct horse battery staple';
    const hash = await argon2Adapter.hash(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await argon2Adapter.compare({ hash, password })).toBe(true);
  });

  test('rejects a wrong password', async () => {
    const hash = await argon2Adapter.hash('secret-one');
    expect(await argon2Adapter.compare({ hash, password: 'secret-two' })).toBe(
      false
    );
  });

  test('uses the OWASP argon2id memory cost (19456 KiB)', async () => {
    const hash = await argon2Adapter.hash('whatever');
    expect(hash).toContain('m=19456');
  });

  test('produces a distinct hash each call (random salt)', async () => {
    const a = await argon2Adapter.hash('same-input');
    const b = await argon2Adapter.hash('same-input');
    expect(a).not.toBe(b);
  });
});
