<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    children?: Snippet
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  let { class: className, children, open = $bindable(false), onOpenChange }: Props = $props()
</script>

<DropdownMenu.Root bind:open {onOpenChange}>
  <div class={cn(className)}>
    {@render children?.()}
  </div>
</DropdownMenu.Root>
