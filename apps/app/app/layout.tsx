import { DesignSystemProvider } from '@pack/design-system';
import { fonts } from '@pack/design-system/lib/fonts';
import './styles.css';

import { locales } from '@pack/i18n';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

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
        <DesignSystemProvider>
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
}
