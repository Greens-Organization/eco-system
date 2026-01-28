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
import { Gauge, Settings, Trees, Users, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { useLocale, useTranslation } from '@/lib/i18n';
import { UserAvatar } from './user-avatar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslation();
  const locale = useLocale();
  const pathName = usePathname();

  const pathWithoutLocale = pathName.replace(`/${locale}`, '');
  const currentPath = pathWithoutLocale.split('/')[1] || '';

  const navMenu = [
    {
      title: t.app.sidebar.general,
      items: [
        {
          title: t.app.navigation.dashboard,
          url: `/${locale}`,
          icon: Gauge,
        },
        {
          title: t.app.sidebar.customers,
          url: `/${locale}/clientes`,
          icon: UsersRound,
        },
        {
          title: t.app.sidebar.employees,
          url: `/${locale}/colaboradores`,
          icon: Users,
        },
        {
          title: t.app.sidebar.configurations,
          url: `/${locale}/configuracoes`,
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="mb-2 h-16 justify-center max-md:mt-2">
        <div className="flex gap-2 px-2 transition-[padding] duration-200 ease-in-out group-data-[collapsible=icon]:px-0">
          <Link className="group/logo inline-flex" href="/">
            <Trees className="h-6 w-6" />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="-mt-2">
        {navMenu.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="text-muted-foreground/65 uppercase">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => {
                  const itemPath = item.url
                    .replace(`/${locale}`, '')
                    .replace('/', '');
                  const isActive =
                    itemPath === currentPath ||
                    (itemPath === '' && currentPath === '');

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        className="group/menu-button h-9 gap-3 font-medium group-data-[collapsible=icon]:px-1.5 [&>svg]:size-auto"
                        tooltip={item.title}
                        isActive={isActive}
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
                      />
                    </SidebarMenuItem>
                  );
                })}
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
