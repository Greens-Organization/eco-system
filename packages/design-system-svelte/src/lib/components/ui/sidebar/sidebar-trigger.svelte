<script lang="ts">
  import { PanelLeft } from 'lucide-svelte'
  import { getSidebarContext } from './sidebar-context.svelte'
  import { cn } from '../../../utils/cn'

  interface Props { class?: string }
  let { class: className }: Props = $props()

  const ctx = getSidebarContext()
</script>

<button
  type="button"
  onclick={ctx.toggle}
  class={cn(
    'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    className
  )}
  data-slot="sidebar-trigger"
  aria-label="Toggle sidebar"
>
  <PanelLeft class="size-4" />
</button>
