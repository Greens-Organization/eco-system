<script lang="ts">
import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import { cn, type WithElementRef } from '../../../lib/utils.js';

let {
  ref = $bindable(null),
  class: className,
  child,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
  child?: Snippet<[{ props: Record<string, unknown> }]>;
} = $props();

const mergedProps = $derived({
  ...restProps,
  class: cn(
    "flex items-center gap-2 rounded-md border bg-muted px-4 font-medium text-sm shadow-xs [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
    className
  ),
});
</script>

{#if child}
    {@render child({ props: mergedProps })}
{:else}
    <div bind:this={ref} {...mergedProps}>
        {@render mergedProps.children?.()}
    </div>
{/if}
