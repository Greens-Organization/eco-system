<script lang="ts">
import type { Snippet } from 'svelte';
import { setI18n } from '#lib/i18n/context.svelte.js';

interface Props {
  data: { locale: App.Locals['locale']; dictionary: App.Locals['dictionary'] };
  children?: Snippet;
}

let { data, children }: Props = $props();

setI18n(
  () => data.locale,
  () => data.dictionary
);

// The server sets <html lang>; a client-side language switch updates it.
$effect(() => {
  document.documentElement.lang = data.locale;
});
</script>

<!-- Components read the dictionary once (`const t = useTranslation()`), so a
     language switch remounts the tree instead of patching it. -->
{#key data.locale}
    {@render children?.()}
{/key}
