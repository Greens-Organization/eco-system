<script lang="ts">
import * as Sidebar from '@pack/design-system/components/ui/sidebar';
import { Toaster } from '@pack/design-system/components/ui/sonner';
import type { Snippet } from 'svelte';
import AppSidebar from '$lib/components/sidebar/app-sidebar.svelte';

interface Props {
  children?: Snippet;
}
let { children }: Props = $props();
</script>

<Toaster richColors closeButton />

<Sidebar.Provider>
    <AppSidebar />
    <Sidebar.Inset>
        {@render children?.()}
    </Sidebar.Inset>
</Sidebar.Provider>
