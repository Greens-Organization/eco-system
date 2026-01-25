import { AnalyticsProvider } from '@pack/analytics';
import { AuthProvider } from '@pack/auth/provider';
import type { ThemeProviderProps } from 'next-themes';
import { TooltipProvider } from './components/ui/base-tooltip';
import { ThemeProvider } from './providers/theme';

type DesignSystemProviderProperties = ThemeProviderProps & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};

export const DesignSystemProvider = ({
  children,
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <AuthProvider privacyUrl={privacyUrl} termsUrl={termsUrl} helpUrl={helpUrl}>
      <AnalyticsProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AnalyticsProvider>
    </AuthProvider>
  </ThemeProvider>
);
