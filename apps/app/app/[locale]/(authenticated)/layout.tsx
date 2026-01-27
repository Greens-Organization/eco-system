import { env } from '@/env';
import { auth } from '@pack/auth/server';
import { secure } from '@pack/security';
import type { ReactNode } from 'react';
import { GlobalSidebar } from './components/sidebar';
import { SidebarProvider } from '@pack/design-system/components/ui/sidebar';

type AppLayoutProperties = {
  readonly children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProperties) {
  return (
      <SidebarProvider>
        <GlobalSidebar>
          {children}
        </GlobalSidebar>
      </SidebarProvider>
  );
};
