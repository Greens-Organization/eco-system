<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { locales, addLocaleToPathname, removeLocaleFromPathname } from '@pack/i18n/utils'
  import { useLocale } from '$lib/i18n/context.svelte'

  const locale = useLocale()

  const languageNames: Record<string, string> = {
    en: '🇺🇸 English',
    es: '🇪🇸 Español',
    pt: '🇧🇷 Português',
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const newLocale = target.value
    const currentPath = removeLocaleFromPathname(page.url.pathname)
    goto(addLocaleToPathname(currentPath, newLocale as typeof locales[number]))
  }
</script>

<select
  value={locale}
  onchange={handleChange}
  class="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  aria-label="Select language"
>
  {#each locales as l (l)}
    <option value={l}>{languageNames[l] ?? l}</option>
  {/each}
</select>
