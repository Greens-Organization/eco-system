<script lang="ts">
import { ModeWatcher } from 'mode-watcher';
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
  defaultTheme?: 'light' | 'dark' | 'system';
}

let { children, defaultTheme = 'system' }: Props = $props();
</script>

<ModeWatcher defaultMode={defaultTheme} />
{@render children?.()}
