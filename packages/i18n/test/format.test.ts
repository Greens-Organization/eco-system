import { describe, expect, test } from 'bun:test';
import { formatCurrency, formatNumber, formatPercent } from '../src/format';

// Intl separates currency and digits with a no-break space in some locales.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatCurrency', () => {
  test('each locale has its own default currency', () => {
    expect(plain(formatCurrency(1234.56, 'en'))).toBe('$1,234.56');
    expect(plain(formatCurrency(1234.56, 'pt'))).toBe('R$ 1.234,56');
    expect(plain(formatCurrency(1234.56, 'es'))).toBe('1234,56 €');
  });

  test('an explicit currency wins over the default', () => {
    expect(plain(formatCurrency(1234.56, 'en', 'EUR'))).toBe('€1,234.56');
    expect(plain(formatCurrency(10, 'pt', 'USD'))).toBe('US$ 10,00');
  });
});

describe('formatNumber', () => {
  test('groups and separates decimals per locale', () => {
    expect(formatNumber(1234567.89, 'en')).toBe('1,234,567.89');
    expect(formatNumber(1234567.89, 'pt')).toBe('1.234.567,89');
  });

  test('passes options through', () => {
    expect(formatNumber(1234.5678, 'en', { maximumFractionDigits: 2 })).toBe(
      '1,234.57'
    );
  });
});

describe('formatPercent', () => {
  test('takes a fraction and keeps one decimal by default', () => {
    expect(formatPercent(0.42, 'en')).toBe('42%');
    expect(plain(formatPercent(0.4256, 'pt'))).toBe('42,6%');
  });
});
