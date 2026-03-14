<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    children?: Snippet
    href?: string
    isActive?: boolean
    tooltip?: string
    onclick?: () => void
  }

  let { class: className, children, href, isActive = false, tooltip, onclick }: Props = $props()

  const baseClass = cn(
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm',
    'outline-none ring-sidebar-ring transition-[width,height,padding]',
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground',
    'disabled:pointer-events-none disabled:opacity-50',
    'group-has-data-[sidebar=menu-action]/menu-item:pr-8',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
    isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
    className
  )
</script>

{#if href}
  <a {href} class={baseClass} data-slot="sidebar-menu-button" data-active={isActive} title={tooltip}>
    {@render children?.()}
  </a>
{:else}
  <button
    type="button"
    {onclick}
    class={baseClass}
    data-slot="sidebar-menu-button"
    data-active={isActive}
    title={tooltip}
  >
    {@render children?.()}
  </button>
{/if}
