<script lang="ts">
import '../app.css';
import { DesignSystemProvider } from '@pack/design-system-sv/providers';
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
}
let { children }: Props = $props();
</script>

<DesignSystemProvider>
    {@render children?.()}
</DesignSystemProvider>
