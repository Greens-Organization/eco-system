<script lang="ts">
import {
  addLocaleToPathname,
  locales,
  removeLocaleFromPathname,
} from '@pack/i18n';
import { useLocale, useTranslation } from '#lib/i18n/context.svelte.js';
import { goto } from '$app/navigation';
import { page } from '$app/state';

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
  // Client-side, not a full reload: in vite dev a reload re-requests every
  // module. The loads that render by language rerun (`loadLocale`) and the
  // [locale] layout remounts the tree under the new dictionary. The query
  // (list filters) and the scroll position are kept.
  goto(addLocaleToPathname(currentPath, newLocale) + page.url.search, {
    reset: false,
  });
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
