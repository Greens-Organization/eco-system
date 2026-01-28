import {
  SidebarInset,
  SidebarProvider,
} from '@pack/design-system/components/ui/sidebar';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/sidebar/app-sidebar';

type GlobalSidebarProperties = {
  readonly children: ReactNode;
};

export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
};
