<script lang="ts">
import '../app.css';
import { DesignSystemProvider } from '@pack/design-system/providers';
import type { Snippet } from 'svelte';
import { CSP_NONCE_PLACEHOLDER } from '$lib/csp';

interface Props {
  children?: Snippet;
}
let { children }: Props = $props();
</script>

<DesignSystemProvider nonce={CSP_NONCE_PLACEHOLDER}>
    {@render children?.()}
</DesignSystemProvider>
