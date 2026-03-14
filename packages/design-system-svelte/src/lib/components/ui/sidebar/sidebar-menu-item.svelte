<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props { class?: string; children?: Snippet }
  let { class: className, children }: Props = $props()
</script>

<li class={cn('group/menu-item relative', className)} data-slot="sidebar-menu-item">
  {@render children?.()}
</li>
