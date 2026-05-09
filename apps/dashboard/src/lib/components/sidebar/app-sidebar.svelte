<script lang="ts">
import * as Sidebar from '@pack/design-system/components/ui/sidebar';
import { removeLocaleFromPathname } from '@pack/i18n/utils';
import LayoutDashboard from 'lucide-svelte/icons/layout-dashboard';
import Settings from 'lucide-svelte/icons/settings';
import Trees from 'lucide-svelte/icons/trees';
import UserRound from 'lucide-svelte/icons/user-round';
import Users from 'lucide-svelte/icons/users';
import { page } from '$app/state';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';
import UserAvatar from './user-avatar.svelte';

const t = useTranslation();
const locale = useLocale();

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
]);

const currentPath = $derived(
  removeLocaleFromPathname(page.url.pathname) || '/'
);
</script>

<Sidebar.Root>
    <Sidebar.Header>
        <a
            href="/{locale}"
            class="flex items-center gap-2 px-2 py-1 font-semibold"
        >
            <Trees class="size-5" />
            <span>eco-system</span>
        </a>
    </Sidebar.Header>

    <Sidebar.Content>
        <Sidebar.Group>
            <Sidebar.Menu>
                {#each navItems as item (item.href)}
                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton
                            isActive={currentPath ===
                                removeLocaleFromPathname(item.href)}
                        >
                            {#snippet child({ props })}
                                <a href={item.href} {...props}>
                                    <item.icon class="size-4" />
                                    <span>{item.title}</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                {/each}
            </Sidebar.Menu>
        </Sidebar.Group>
    </Sidebar.Content>

    <Sidebar.Footer>
        <UserAvatar />
    </Sidebar.Footer>
</Sidebar.Root>
