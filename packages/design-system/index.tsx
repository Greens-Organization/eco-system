import { AnalyticsProvider } from '@pack/analytics';
import { AuthProvider } from '@pack/auth/provider';
import type { ThemeProviderProps } from 'next-themes';
import { TooltipProvider } from './components/ui/base-tooltip';
import { ThemeProvider } from './providers/theme';

type DesignSystemProviderProperties = ThemeProviderProps;

export const DesignSystemProvider = ({
  children,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <AuthProvider>
      <AnalyticsProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AnalyticsProvider>
    </AuthProvider>
  </ThemeProvider>
);
