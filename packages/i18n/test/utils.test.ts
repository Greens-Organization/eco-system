import { describe, expect, test } from 'bun:test';
import {
  addLocaleToPathname,
  getLocaleFromPathname,
  isValidLocale,
  removeLocaleFromPathname,
  resolveLocale,
} from '../src/utils';

describe('resolveLocale', () => {
  test('picks the best supported language from Accept-Language', () => {
    expect(resolveLocale('pt-BR,pt;q=0.9,en;q=0.8')).toBe('pt');
    expect(resolveLocale('es-MX,es;q=0.9')).toBe('es');
    expect(resolveLocale('en-GB,en;q=0.9')).toBe('en');
  });

  test('falls back to English for nothing usable', () => {
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale('')).toBe('en');
    expect(resolveLocale('fr-FR,de;q=0.8')).toBe('en');
    expect(resolveLocale('not a header ;;;')).toBe('en');
  });
});

describe('locale in the path', () => {
  test('reads the first segment when it is a locale', () => {
    expect(getLocaleFromPathname('/pt/customers')).toBe('pt');
    expect(getLocaleFromPathname('/customers')).toBe('en');
    expect(getLocaleFromPathname('/')).toBe('en');
  });

  test('removes only a real locale prefix', () => {
    expect(removeLocaleFromPathname('/es/customers/3')).toBe('/customers/3');
    expect(removeLocaleFromPathname('/en')).toBe('/');
    expect(removeLocaleFromPathname('/english/page')).toBe('/english/page');
  });

  test('adds or replaces the prefix', () => {
    expect(addLocaleToPathname('/customers', 'pt')).toBe('/pt/customers');
    expect(addLocaleToPathname('/en/customers', 'es')).toBe('/es/customers');
    expect(addLocaleToPathname('/', 'pt')).toBe('/pt');
  });

  test('isValidLocale accepts only the supported ones', () => {
    expect(isValidLocale('pt')).toBe(true);
    expect(isValidLocale('pt-BR')).toBe(false);
    expect(isValidLocale('fr')).toBe(false);
  });
});
