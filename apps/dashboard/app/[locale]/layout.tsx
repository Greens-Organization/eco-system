import { getDictionary } from '@pack/i18n';
import { I18nProvider } from '@/lib/i18n/provider';
import type { Locale } from '@/lib/i18n/utils';
import type { ReactNode } from 'react';

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      {children}
    </I18nProvider>
  );
}
