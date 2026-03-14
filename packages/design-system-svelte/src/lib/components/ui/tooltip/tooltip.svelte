<script lang="ts">
  import { Tooltip } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    content: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    class?: string
    children?: Snippet
  }

  let { content, side = 'top', class: className, children }: Props = $props()
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger class={cn('inline-flex', className)}>
      {@render children?.()}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        {side}
        sideOffset={4}
        class="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      >
        {content}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
