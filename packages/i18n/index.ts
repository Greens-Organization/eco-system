import type { Dictionary } from './shared';
import { locales } from './shared';

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

const dictionaries: Record<string, () => Promise<Dictionary>> =
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      () =>
        import(`./dictionaries/${locale}.json`)
          .then((mod) => mod.default)
          .catch(async () => {
            return import('./dictionaries/en.json').then((mod) => mod.default);
          }),
    ])
  );

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const normalizedLocale = locale.split('-')[0];

  if (!locales.includes(normalizedLocale as (typeof locales)[number])) {
    console.warn(`Locale "${locale}" is not supported, defaulting to "en"`);
    return dictionaries['en']();
  }

  try {
    return await dictionaries[normalizedLocale]();
  } catch (error) {
    console.error(
      `Error loading dictionary for locale "${normalizedLocale}", falling back to "en"`,
      error
    );
    return dictionaries['en']();
  }
};
