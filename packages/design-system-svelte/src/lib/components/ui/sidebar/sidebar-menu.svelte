<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props { class?: string; children?: Snippet }
  let { class: className, children }: Props = $props()
</script>

<ul class={cn('flex w-full min-w-0 flex-col gap-1', className)} data-slot="sidebar-menu">
  {@render children?.()}
</ul>
