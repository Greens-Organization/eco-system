<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    children?: Snippet
  }

  let { class: className, children }: Props = $props()
</script>

<main
  class={cn(
    'relative flex min-h-svh flex-1 flex-col bg-background',
    'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))]',
    'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0',
    'md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm',
    className
  )}
  data-slot="sidebar-inset"
>
  {@render children?.()}
</main>
