import './styles.css';
import { Toolbar as CMSToolbar } from '@pack/cms/components/toolbar';
import { DesignSystemProvider } from '@pack/design-system';
import { fonts } from '@pack/design-system/lib/fonts';
import { cn } from '@pack/design-system/lib/utils';
import { Toolbar } from '@pack/feature-flags/components/toolbar';
import { getDictionary } from '@pack/i18n';
import type { ReactNode } from 'react';
import { Footer } from './components/footer';
import { Header } from './components/header';

type RootLayoutProperties = {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
};

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <html
      lang="en"
      className={cn(fonts, 'scroll-smooth')}
      suppressHydrationWarning
    >
      <body>
        <DesignSystemProvider>
          <Header dictionary={dictionary} />
          {children}
          <Footer />
        </DesignSystemProvider>
        <Toolbar />
        <CMSToolbar />
      </body>
    </html>
  );
};

export default RootLayout;
