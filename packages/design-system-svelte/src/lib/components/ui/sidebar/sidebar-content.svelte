<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props { class?: string; children?: Snippet }
  let { class: className, children }: Props = $props()
</script>

<div
  class={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden', className)}
  data-slot="sidebar-content"
>
  {@render children?.()}
</div>
