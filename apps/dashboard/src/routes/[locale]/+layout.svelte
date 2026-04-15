<script lang="ts">
import type { Snippet } from 'svelte';
import { setI18n } from '$lib/i18n/context.svelte';

interface Props {
  data: { locale: App.Locals['locale']; dictionary: App.Locals['dictionary'] };
  children?: Snippet;
}

let { data, children }: Props = $props();

const ctx = setI18n(data.locale, data.dictionary);

$effect(() => {
  ctx.locale = data.locale;
  ctx.dictionary = data.dictionary;
});
</script>

{@render children?.()}
