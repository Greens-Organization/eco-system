<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
import { cn } from '../../../lib/utils.js';
import {
  type ButtonSize,
  type ButtonVariant,
  buttonVariants,
} from '../button/index.js';

let {
  ref = $bindable(null),
  class: className,
  variant = 'default',
  size = 'default',
  ...restProps
}: AlertDialogPrimitive.ActionProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
} = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	data-slot="alert-dialog-action"
	class={cn(buttonVariants({ variant, size }), "", className)}
	{...restProps}
/>
