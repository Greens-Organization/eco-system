<script lang="ts">
  import { Separator } from 'bits-ui'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    orientation?: 'horizontal' | 'vertical'
    decorative?: boolean
  }

  let { class: className, orientation = 'horizontal', decorative = true }: Props = $props()
</script>

<Separator.Root
  {orientation}
  {decorative}
  class={cn(
    'shrink-0 bg-border',
    orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    className
  )}
/>
