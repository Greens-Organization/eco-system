'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@pack/design-system/components/ui/sidebar';
import {
  Gauge,
  HousePlug,
  Kanban,
  NotepadText,
  PlugZap,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { UserAvatar } from './user-avatar';

// This is sample data.
const navMenu = [
  {
    title: 'General',
    items: [
      {
        title: 'Dashboard',
        url: '/',
        icon: Gauge,
      },
      {
        title: 'Simulação',
        url: '/simulacao',
        icon: PlugZap,
      },
      {
        title: 'Relatórios',
        url: '/relatorios',
        icon: NotepadText,
      },
      {
        title: 'Kanban',
        url: '/relatorios/kanban',
        icon: Kanban,
      },
      {
        title: 'Unidades',
        url: '/unidades',
        icon: HousePlug,
      },
      {
        title: 'Clientes',
        url: '/clientes',
        icon: UsersRound,
      },
      {
        title: 'Colaboradores',
        url: '/colaboradores',
        icon: Users,
      },
      {
        title: 'Configurações',
        url: '/configuracoes',
        icon: Settings,
      },
    ],
  },
];

function SidebarLogo() {
  const id = React.useId();
  return (
    <div className="flex gap-2 px-2 transition-[padding] duration-200 ease-in-out group-data-[collapsible=icon]:px-0">
      <Link className="group/logo inline-flex" href="/">
        <Trees
        className='w-6 h-6'
        />
      </Link>
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathName = usePathname();
  const currentPath = pathName.split('/')[1];
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="mb-2 h-16 justify-center max-md:mt-2">
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent className="-mt-2">
        {navMenu.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="text-muted-foreground/65 uppercase">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className="group/menu-button h-9 gap-3 font-medium group-data-[collapsible=icon]:px-[5px]! [&>svg]:size-auto"
                      tooltip={item.title}
                      isActive={item.url.replace('/', '') === currentPath}
                      render={
                      <a href={item.url}>
                        {item.icon && (
                          <item.icon
                            className="text-muted-foreground/65 group-data-[active=true]/menu-button:text-foreground dark:group-data-[active=true]/menu-button:text-genergia-primary"
                            size={22}
                            aria-hidden="true"
                          />
                        )}
                        <span>{item.title}</span>
                      </a>
                      }
                    >
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserAvatar />
      </SidebarFooter>
    </Sidebar>
  );
}
