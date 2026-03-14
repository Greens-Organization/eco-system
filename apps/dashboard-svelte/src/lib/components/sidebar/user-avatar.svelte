<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { EllipsisVertical, LogOut, Moon, Sun, User } from 'lucide-svelte'
  import { toggleMode, mode } from 'mode-watcher'
  import { authClient } from '@pack/auth/client.svelte'
  import { genericAvatar, DropdownMenuPrimitive } from '@pack/design-system-svelte'
  import { useLocale, useTranslation } from '$lib/i18n/context.svelte'

  const locale = useLocale()
  const t = useTranslation()

  const user = $derived(page.data.user)

  const avatarSrc = $derived(
    user?.image ?? genericAvatar(user?.name ?? user?.email ?? 'U')
  )

  async function handleSignOut() {
    await authClient.signOut()
    goto(`/${locale}/sign-in`)
  }

  const btnClass =
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ' +
    'outline-none ring-sidebar-ring transition-[width,height,padding] ' +
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
    'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
</script>

{#if user}
  <DropdownMenuPrimitive.Root>
    <DropdownMenuPrimitive.Trigger>
      {#snippet child({ props })}
        <button type="button" {...props} class={btnClass}>
          <img
            src={avatarSrc}
            alt={user?.name}
            class="size-8 shrink-0 rounded-full object-cover"
          />
          <div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span class="truncate font-medium">{user?.name}</span>
          </div>
          <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/50">
            <EllipsisVertical class="size-4 opacity-40" />
          </div>
        </button>
      {/snippet}
    </DropdownMenuPrimitive.Trigger>

    <DropdownMenuPrimitive.Content
      side="right"
      align="end"
      sideOffset={4}
      class="min-w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
    >
      <DropdownMenuPrimitive.Item
        class="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
        onclick={toggleMode}
      >
        {#if mode.current === 'light'}
          <Moon class="size-4 text-muted-foreground/70" />
        {:else}
          <Sun class="size-4 text-muted-foreground/70" />
        {/if}
        <span>{t.app.sidebar.changeTheme}</span>
      </DropdownMenuPrimitive.Item>

      <DropdownMenuPrimitive.Item
        class="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
        onclick={() => goto(`/${locale}/profile`)}
      >
        <User class="size-4 text-muted-foreground/70" />
        <span>{t.app.sidebar.profile}</span>
      </DropdownMenuPrimitive.Item>

      <DropdownMenuPrimitive.Separator class="my-1 h-px bg-border" />

      <DropdownMenuPrimitive.Item
        class="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
        onclick={handleSignOut}
      >
        <LogOut class="size-4 text-destructive/70" />
        <span class="text-destructive/70">{t.app.common.logout}</span>
      </DropdownMenuPrimitive.Item>
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Root>
{/if}
