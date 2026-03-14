<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    children?: Snippet
  }

  let { class: className, children }: Props = $props()
</script>

<nav aria-label="breadcrumb" class={cn('flex', className)} data-slot="breadcrumb">
  <ol class="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
    {@render children?.()}
  </ol>
</nav>
