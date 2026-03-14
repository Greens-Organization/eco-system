<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props { class?: string; children?: Snippet }
  let { class: className, children }: Props = $props()
</script>

<div class={cn('flex flex-col gap-2 p-2', className)} data-slot="sidebar-header">
  {@render children?.()}
</div>
