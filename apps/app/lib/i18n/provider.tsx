'use client';

import type { Dictionary } from '@pack/i18n/shared';
import { createContext, type ReactNode, useContext } from 'react';
import type { Locale } from './utils';

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

interface I18nProviderProps {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}

export function I18nProvider({
  locale,
  dictionary,
  children,
}: I18nProviderProps) {
  return (
    <I18nContext.Provider value={{ locale, dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}

export function useTranslation() {
  const { dictionary } = useI18n();
  return dictionary;
}

export function useLocale() {
  const { locale } = useI18n();
  return locale;
}
