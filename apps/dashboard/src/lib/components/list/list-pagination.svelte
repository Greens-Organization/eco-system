<script lang="ts">
import { buttonVariants } from '@pack/design-system/components/ui/button';
import { page as pageState } from '$app/state';
import { useTranslation } from '$lib/i18n/context.svelte';
import { withParams } from '$lib/list-query';

interface Props {
  page: number;
  pages: number;
}

let { page, pages }: Props = $props();

const t = useTranslation();
const hrefFor = (n: number) =>
  withParams(pageState.url, { page: n > 1 ? n : undefined });
const linkClass = buttonVariants({ variant: 'outline', size: 'sm' });
</script>

{#if pages > 1}
    <nav aria-label={t.app.list.pageOf.replace('{page}', String(page)).replace('{pages}', String(pages))} class="flex items-center justify-between gap-2">
        <span class="text-sm text-muted-foreground">
            {t.app.list.pageOf.replace('{page}', String(page)).replace('{pages}', String(pages))}
        </span>
        <div class="flex gap-2">
            {#if page > 1}
                <a href={hrefFor(page - 1)} class={linkClass} rel="prev">{t.app.list.previous}</a>
            {/if}
            {#if page < pages}
                <a href={hrefFor(page + 1)} class={linkClass} rel="next">{t.app.list.next}</a>
            {/if}
        </div>
    </nav>
{/if}
