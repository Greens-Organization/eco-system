<script lang="ts">
import * as Sidebar from '@pack/design-system/components/ui/sidebar';
import { Toaster } from '@pack/design-system/components/ui/sonner';
import type { Snippet } from 'svelte';
import PageSkeleton from '#lib/components/page-skeleton.svelte';
import AppSidebar from '#lib/components/sidebar/app-sidebar.svelte';
import { navigating } from '$app/state';
import type { LayoutData } from './$types';

interface Props {
  data: LayoutData;
  children?: Snippet;
}
let { data, children }: Props = $props();

// Client-side navigation keeps the old page until the new load finishes.
// Past 200 ms show the new page's skeleton instead; a fast load never flashes.
const SKELETON_DELAY_MS = 200;
let slow = $state(false);
$effect(() => {
  if (!navigating.to) {
    slow = false;
    return;
  }
  const timer = setTimeout(() => {
    slow = true;
  }, SKELETON_DELAY_MS);
  return () => clearTimeout(timer);
});
// Only inside the panel: leaving it (sign-out) keeps the page until it goes.
const target = $derived(navigating.to?.route.id ?? null);
const loading = $derived(slow && !!target?.includes('(authenticated)'));
</script>

<Toaster richColors closeButton />

<Sidebar.Provider open={data.sidebarOpen}>
    <AppSidebar />
    <Sidebar.Inset>
        {#if loading}
            <PageSkeleton routeId={target} />
        {:else}
            {@render children?.()}
        {/if}
    </Sidebar.Inset>
</Sidebar.Provider>
