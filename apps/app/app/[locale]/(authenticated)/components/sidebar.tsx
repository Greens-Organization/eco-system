import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  useSidebar,
} from '@pack/design-system/components/ui/sidebar';
import { ReactNode } from 'react';

type GlobalSidebarProperties = {
  readonly children: ReactNode;
};


export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  return (
    <SidebarProvider>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )

};
