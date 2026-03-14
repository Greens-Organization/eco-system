<script lang="ts">
  import { page } from '$app/state'
  import { Trees, LayoutDashboard, Users, Settings, UserRound } from 'lucide-svelte'
  import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
  } from '@pack/design-system-svelte'
  import { useTranslation, useLocale } from '$lib/i18n/context.svelte'
  import { removeLocaleFromPathname } from '@pack/i18n/utils'
  import UserAvatar from './user-avatar.svelte'

  const t = useTranslation()
  const locale = useLocale()

  const navItems = $derived([
    {
      title: t.app.navigation.dashboard,
      href: `/${locale}`,
      icon: LayoutDashboard,
    },
    {
      title: t.app.navigation.customers,
      href: `/${locale}/customers`,
      icon: Users,
    },
    {
      title: t.app.navigation.employees,
      href: `/${locale}/employees`,
      icon: UserRound,
    },
    {
      title: t.app.navigation.settings,
      href: `/${locale}/settings`,
      icon: Settings,
    },
  ])

  const currentPath = $derived(removeLocaleFromPathname(page.url.pathname) || '/')
</script>

<Sidebar>
  <SidebarHeader>
    <a href="/{locale}" class="flex items-center gap-2 px-2 py-1 font-semibold">
      <Trees class="size-5" />
      <span>eco-system</span>
    </a>
  </SidebarHeader>

  <SidebarContent>
    <SidebarGroup>
      <SidebarMenu>
        {#each navItems as item (item.href)}
          <SidebarMenuItem>
            <SidebarMenuButton
              href={item.href}
              isActive={currentPath === removeLocaleFromPathname(item.href) || currentPath === '/'}
            >
              <item.icon class="size-4" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/each}
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>

  <SidebarFooter>
    <UserAvatar />
  </SidebarFooter>
</Sidebar>
