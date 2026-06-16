import type { Dictionary } from './shared';
import { locales } from './shared';
import { defaultLocale, isValidLocale, type Locale } from './utils';

export { formatCurrency, formatNumber, formatPercent } from './format';
export type { Locale } from './utils';
export {
  addLocaleToPathname,
  defaultLocale,
  getLocaleFromPathname,
  isValidLocale,
  removeLocaleFromPathname,
  resolveLocale,
} from './utils';
export { type Dictionary, locales };

const loadDictionary = (locale: Locale): Promise<Dictionary> =>
  import(`./dictionaries/${locale}.json`).then((mod) => mod.default);

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const normalizedLocale = locale.split('-')[0] ?? '';

  if (!isValidLocale(normalizedLocale)) {
    console.warn(
      `Locale "${locale}" is not supported, defaulting to "${defaultLocale}"`
    );
    return loadDictionary(defaultLocale);
  }

  try {
    return await loadDictionary(normalizedLocale);
  } catch (error) {
    console.error(
      `Error loading dictionary for locale "${normalizedLocale}", falling back to "${defaultLocale}"`,
      error
    );
    return loadDictionary(defaultLocale);
  }
};
