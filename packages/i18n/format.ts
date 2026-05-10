import type { Locale } from './utils';

/**
 * Default currency per locale — boilerplate sensible defaults so the
 * dashboard can render `formatCurrency(value, locale)` without picking
 * a currency at every call site. Apps that need per-tenant or per-user
 * currency should pass the third argument explicitly.
 */
const defaultCurrencyByLocale: Record<Locale, string> = {
  en: 'USD',
  pt: 'BRL',
  es: 'EUR',
};

/**
 * Formats a numeric amount as a currency string using the user's locale.
 * Display only — for storage and arithmetic, use integer cents (or a
 * decimal lib) and a single canonical currency.
 *
 * @example
 *   formatCurrency(1234.56, 'pt');           // "R$ 1.234,56"
 *   formatCurrency(1234.56, 'en', 'EUR');    // "€1,234.56"
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string = defaultCurrencyByLocale[locale]
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Formats a number with locale-aware grouping/decimal separators.
 *
 * @example
 *   formatNumber(1234567.89, 'pt');  // "1.234.567,89"
 *   formatNumber(1234567.89, 'en');  // "1,234,567.89"
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Formats a relative or absolute percentage. Pass `0.42` for `42%`.
 */
export function formatPercent(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}
