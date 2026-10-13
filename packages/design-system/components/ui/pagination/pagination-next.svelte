<script lang="ts">
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
import { Pagination as PaginationPrimitive } from 'bits-ui';
import { cn } from '../../../lib/utils.js';
import { buttonVariants } from '../button/index.js';

let {
  ref = $bindable(null),
  class: className,
  ...restProps
}: PaginationPrimitive.NextButtonProps = $props();
</script>

<PaginationPrimitive.NextButton
	bind:ref
	aria-label="Go to next page"
	class={cn(buttonVariants({ variant: "ghost", size: "default" }), "pr-1.5!", className)}
	{...restProps}
>
	<span class="hidden sm:block">Next</span>
	<ChevronRightIcon data-icon="inline-end" class="cn-rtl-flip" />
</PaginationPrimitive.NextButton>
