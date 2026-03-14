<script lang="ts">
  import type { Snippet } from 'svelte'
  import { setSidebarContext } from './sidebar-context.svelte'

  interface Props {
    children?: Snippet
    defaultOpen?: boolean
  }

  let { children, defaultOpen = true }: Props = $props()

  let open = $state(defaultOpen)
  let isMobile = $state(false)

  function toggle() {
    open = !open
  }

  setSidebarContext({
    get open() { return open },
    toggle,
    get isMobile() { return isMobile },
  })

  $effect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    isMobile = mql.matches
    const handler = (e: MediaQueryListEvent) => { isMobile = e.matches }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  })
</script>

<div class="flex min-h-svh w-full" data-slot="sidebar-provider">
  {@render children?.()}
</div>
