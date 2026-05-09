<script lang="ts">
import * as DropdownMenu from '@pack/design-system/components/ui/dropdown-menu';
import { genericAvatar } from '@pack/design-system/lib/utils';
import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
import LogOut from 'lucide-svelte/icons/log-out';
import Moon from 'lucide-svelte/icons/moon';
import Sun from 'lucide-svelte/icons/sun';
import User from 'lucide-svelte/icons/user';
import { mode, toggleMode } from 'mode-watcher';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';

const t = useTranslation();

const locale = useLocale();

const user = $derived(page.data.user);

const avatarSrc = $derived(
  user?.image ?? genericAvatar(user?.name ?? user?.email ?? 'U')
);

const btnClass =
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ' +
  'outline-none ring-sidebar-ring transition-[width,height,padding] ' +
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground';
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger>
        {#snippet child({ props })}
            <button type="button" {...props} class={btnClass}>
                <img
                    src={avatarSrc}
                    alt={user?.name ?? 'User'}
                    class="size-8 shrink-0 rounded-full object-cover"
                />
                <div
                    class="grid min-w-0 flex-1 text-left text-sm leading-tight"
                >
                    <span class="truncate font-medium"
                        >{user?.name ?? '—'}</span
                    >
                </div>
                <div
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/50"
                >
                    <EllipsisVertical class="size-4 opacity-40" />
                </div>
            </button>
        {/snippet}
    </DropdownMenu.Trigger>

        <DropdownMenu.Content
            side="right"
            align="end"
            sideOffset={4}
            class="min-w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
            <DropdownMenu.Item
                class="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                onclick={toggleMode}
            >
                {#if mode.current === "light"}
                    <Moon class="size-4 text-muted-foreground/70" />
                {:else}
                    <Sun class="size-4 text-muted-foreground/70" />
                {/if}
                <span>{t.app.sidebar.changeTheme}</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
                class="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                onclick={() => goto(`/${locale}/profile`)}
            >
                <User class="size-4 text-muted-foreground/70" />
                <span>{t.app.sidebar.profile}</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator class="my-1 h-px bg-border" />

            <DropdownMenu.Item asChild>
                {#snippet child({ props })}
                    <form method="POST" action="/{locale}/sign-out">
                        <button
                            type="submit"
                            {...props}
                            class="flex w-full cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                        >
                            <LogOut class="size-4 text-destructive/70" />
                            <span class="text-destructive/70"
                                >{t.app.common.logout}</span
                            >
                        </button>
                    </form>
                {/snippet}
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
