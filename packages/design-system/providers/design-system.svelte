<script lang="ts">
import { ModeWatcher } from 'mode-watcher';
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
  defaultTheme?: 'light' | 'dark' | 'system';
  /** CSP nonce for ModeWatcher's inline theme script (server render only). */
  nonce?: string;
}

let { children, defaultTheme = 'system', nonce }: Props = $props();
</script>

<ModeWatcher defaultMode={defaultTheme} {nonce} />
{@render children?.()}
