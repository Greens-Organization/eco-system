<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'
  import { getSidebarContext } from './sidebar-context.svelte'

  interface Props {
    class?: string
    children?: Snippet
    side?: 'left' | 'right'
    variant?: 'sidebar' | 'inset'
  }

  let { class: className, children, side = 'left', variant = 'sidebar' }: Props = $props()

  const ctx = getSidebarContext()
</script>

<aside
  class={cn(
    'group peer hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
    'relative h-svh w-[--sidebar-width] flex-col overflow-hidden',
    !ctx.open && 'w-[--sidebar-width-icon]',
    'transition-[width] duration-200 ease-linear',
    variant === 'inset' && 'rounded-xl shadow-sm m-2 h-[calc(100svh-theme(spacing.4))]',
    className
  )}
  style="--sidebar-width: 16rem; --sidebar-width-icon: 3rem;"
  data-slot="sidebar"
  data-state={ctx.open ? 'expanded' : 'collapsed'}
  data-side={side}
>
  {@render children?.()}
</aside>
