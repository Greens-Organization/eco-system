<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    label?: string
    children?: Snippet
  }

  let { class: className, label, children }: Props = $props()
</script>

<div class={cn('relative flex w-full min-w-0 flex-col p-2', className)} data-slot="sidebar-group">
  {#if label}
    <div
      class="flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0"
      data-slot="sidebar-group-label"
    >
      {label}
    </div>
  {/if}
  <div class="flex w-full min-w-0 flex-col gap-1" data-slot="sidebar-group-content">
    {@render children?.()}
  </div>
</div>
