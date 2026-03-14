<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../utils/cn'
  import { badgeVariants, type BadgeVariants } from './index'

  interface Props extends HTMLAttributes<HTMLSpanElement>, BadgeVariants {}

  let { class: className, variant, size, appearance, children, ...props }: Props = $props()
</script>

<span
  class={cn(badgeVariants({ variant, size, appearance }), className)}
  data-slot="badge"
  {...props}
>
  {@render children?.()}
</span>
