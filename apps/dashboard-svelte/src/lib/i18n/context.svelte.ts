import type { Dictionary, Locale } from '@pack/i18n';
import { getContext, setContext } from 'svelte';

class I18nContext {
  locale: Locale = $state('en' as Locale);
  dictionary: Dictionary = $state({} as Dictionary);

  constructor(locale: Locale, dictionary: Dictionary) {
    this.locale = locale;
    this.dictionary = dictionary;
  }
}

const I18N_KEY = Symbol('i18n');

export function setI18n(locale: Locale, dictionary: Dictionary): I18nContext {
  const ctx = new I18nContext(locale, dictionary);
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
