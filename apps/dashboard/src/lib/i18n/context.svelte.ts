import type { Dictionary, Locale } from '@pack/i18n';
import { getContext, setContext } from 'svelte';

/**
 * I18n context backed by accessor closures so that consumers re-read
 * the latest `data.locale` / `data.dictionary` on every access. Avoids
 * the Svelte 5 `state_referenced_locally` warning that fires when
 * reactive props are passed by value at creation time.
 */
class I18nContext {
  readonly #getLocale: () => Locale;
  readonly #getDictionary: () => Dictionary;

  constructor(getLocale: () => Locale, getDictionary: () => Dictionary) {
    this.#getLocale = getLocale;
    this.#getDictionary = getDictionary;
  }

  get locale(): Locale {
    return this.#getLocale();
  }

  get dictionary(): Dictionary {
    return this.#getDictionary();
  }
}

const I18N_KEY = Symbol('i18n');

export function setI18n(
  getLocale: () => Locale,
  getDictionary: () => Dictionary
): I18nContext {
  const ctx = new I18nContext(getLocale, getDictionary);
  setContext(I18N_KEY, ctx);
  return ctx;
}

export function getI18n(): I18nContext {
  return getContext<I18nContext>(I18N_KEY);
}

export function useTranslation(): Dictionary {
  return getI18n().dictionary;
}

export function useLocale(): Locale {
  return getI18n().locale;
}
