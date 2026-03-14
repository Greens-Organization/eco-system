<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../utils/cn'

  interface Props extends HTMLAttributes<HTMLDivElement> {}

  let { class: className, ...props }: Props = $props()
</script>

<div
  class={cn('animate-pulse rounded-md bg-muted', className)}
  data-slot="skeleton"
  {...props}
></div>
