import { describe, expect, test } from 'bun:test';
import { resetRefusal } from '../src/reset-guard';

describe('resetRefusal', () => {
  test.each([
    'postgresql://user:pw@localhost:5432/postgres',
    'postgresql://user:pw@127.0.0.1:5436/eco_test',
    'postgres://user:pw@[::1]:5432/db',
  ])('a database on this machine may be reset: %s', (url) => {
    expect(resetRefusal(url, 'local')).toBeNull();
    expect(resetRefusal(url, undefined)).toBeNull();
  });

  // The old guard only checked NODE_ENV, which the package's .env sets to
  // "local": a production URL in the shell passed.
  test('a remote database is refused whatever NODE_ENV says', () => {
    expect(
      resetRefusal('postgresql://u:p@db.prod.example.com:5432/app', 'local')
    ).toMatch(/not this machine/);
    expect(resetRefusal('postgresql://u:p@db-pg:5432/app', 'local')).toMatch(
      /not this machine/
    );
  });

  test('production is refused even on localhost', () => {
    expect(
      resetRefusal('postgresql://u:p@localhost:5432/app', 'production')
    ).toMatch(/production/);
  });

  test('a malformed URL is refused, not trusted', () => {
    expect(resetRefusal('not a url', 'local')).toMatch(/valid URL/);
  });
});
