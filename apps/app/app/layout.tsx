import { env } from '@/env';
import { DesignSystemProvider } from '@pack/design-system';
import { fonts } from '@pack/design-system/lib/fonts';
import './styles.css';

import { locales } from '@pack/i18n';
import type { ReactNode } from 'react';

type RootLayoutProperties = {
  readonly children: ReactNode;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <body>
        <DesignSystemProvider
          privacyUrl={new URL(
            '/legal/privacy',
            env.NEXT_PUBLIC_WEB_URL
          ).toString()}
          termsUrl={new URL('/legal/terms', env.NEXT_PUBLIC_WEB_URL).toString()}
          helpUrl={env.NEXT_PUBLIC_DOCS_URL}
        >
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
}
