import { describe, expect, test } from 'bun:test';
import { loadLocale } from '../../src/lib/server/locale';

const locals = { locale: 'en' } as App.Locals;

describe('loadLocale', () => {
  test('takes the locale from the route params', () => {
    expect(loadLocale({ params: { locale: 'pt' }, locals })).toBe('pt');
  });

  test('reads params.locale, so Kit tracks it as a dependency', () => {
    const read: string[] = [];
    const params = new Proxy({ locale: 'es' } as Record<string, string>, {
      get(target, key: string) {
        read.push(key);
        return target[key];
      },
    });
    loadLocale({ params, locals });
    expect(read).toContain('locale');
  });

  test('falls back to locals outside a [locale] route or on a bad param', () => {
    expect(loadLocale({ params: {}, locals })).toBe('en');
    expect(loadLocale({ params: { locale: 'xx' }, locals })).toBe('en');
  });
});
