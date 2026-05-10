<script lang="ts">
import {
  addLocaleToPathname,
  locales,
  removeLocaleFromPathname,
} from '@pack/i18n/utils';
import { page } from '$app/state';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';

const locale = useLocale();
const t = useTranslation();

const languageNames: Record<string, string> = {
  en: '🇺🇸 English',
  es: '🇪🇸 Español',
  pt: '🇧🇷 Português',
};

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const newLocale = target.value as (typeof locales)[number];
  const currentPath = removeLocaleFromPathname(page.url.pathname);
  // Full browser navigation (not SvelteKit client routing) so the
  // dictionary, lang attribute, and any locale-bound state are reset
  // from a fresh server render.
  window.location.assign(addLocaleToPathname(currentPath, newLocale));
}
</script>

<select
    value={locale}
    onchange={handleChange}
    class="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    aria-label={t.app.common.selectLanguage}
>
    {#each locales as l (l)}
        <option value={l}>{languageNames[l] ?? l}</option>
    {/each}
</select>
