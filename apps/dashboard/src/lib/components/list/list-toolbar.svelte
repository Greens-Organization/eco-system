<script lang="ts">
import { Button } from '@pack/design-system/components/ui/button';
import { useTranslation } from '$lib/i18n/context.svelte';

interface Props {
  q?: string;
  status?: string;
  statuses: { value: string; label: string }[];
  /** The list's path without filters, for "Clear". */
  clearHref: string;
}

let { q = '', status = '', statuses, clearHref }: Props = $props();

const t = useTranslation();
const fieldClass =
  'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<!-- A GET form: filters live in the URL, so they work without JS, survive a
     reload and can be shared. Submitting starts again at page 1. -->
<form method="GET" class="flex flex-wrap items-end gap-2" role="search">
    <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium">{t.app.list.search}</span>
        <input
            type="search"
            name="q"
            value={q}
            maxlength={100}
            placeholder={t.app.list.searchPlaceholder}
            class="{fieldClass} w-56"
        />
    </label>
    <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium">{t.app.list.status}</span>
        <select name="status" class={fieldClass}>
            <option value="" selected={!status}>{t.app.list.allStatuses}</option>
            {#each statuses as option (option.value)}
                <option value={option.value} selected={status === option.value}>
                    {option.label}
                </option>
            {/each}
        </select>
    </label>
    <Button type="submit" size="sm">{t.app.list.apply}</Button>
    {#if q || status}
        <Button href={clearHref} variant="ghost" size="sm">{t.app.list.clear}</Button>
    {/if}
</form>
