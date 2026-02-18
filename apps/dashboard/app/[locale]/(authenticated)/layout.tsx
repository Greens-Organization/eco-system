import { SidebarProvider } from '@pack/design-system/components/ui/sidebar';
import type { ReactNode } from 'react';
import { GlobalSidebar } from './components/sidebar';

export const dynamic = 'force-dynamic';

type AppLayoutProperties = {
  readonly children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProperties) {
  return (
    <SidebarProvider>
      <GlobalSidebar>{children}</GlobalSidebar>
    </SidebarProvider>
  );
}
