<script lang="ts">
  import { SidebarProvider, SidebarInset } from '@pack/design-system-svelte'
  import AppSidebar from '$lib/components/sidebar/app-sidebar.svelte'
  import type { Snippet } from 'svelte'

  interface Props { children?: Snippet }
  let { children }: Props = $props()
</script>

<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    {@render children?.()}
  </SidebarInset>
</SidebarProvider>
