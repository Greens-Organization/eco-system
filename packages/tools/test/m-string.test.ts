import { describe, expect, test } from 'bun:test';
import { mstring } from '../src/string/m-string';

describe('MString', () => {
  test('toTitleCase title-cases words, skipping small-word exceptions', () => {
    expect(mstring('JOÃO DA SILVA').toTitleCase().value).toBe('João da Silva');
    expect(mstring('the lord of the rings').toTitleCase().value).toBe(
      'The Lord of the Rings'
    );
  });

  test('getInitials returns first + last initials (uppercased)', () => {
    expect(mstring('Ada Lovelace').getInitials()).toBe('AL');
    expect(mstring('cher').getInitials()).toBe('C');
    expect(mstring('  ').getInitials()).toBe('');
  });

  test('value / toString return the raw string', () => {
    const s = mstring('hello');
    expect(s.value).toBe('hello');
    expect(s.toString()).toBe('hello');
  });
});
