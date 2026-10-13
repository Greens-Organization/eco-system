<script lang="ts">
import { Skeleton } from '@pack/design-system/components/ui/skeleton';
import { useTranslation } from '#lib/i18n/context.svelte.js';

interface Props {
  /** The route being loaded (`navigating.to.route.id`), to pick a shape. */
  routeId: string | null | undefined;
}

let { routeId }: Props = $props();
const t = useTranslation();

const shape = $derived.by(() => {
  const id = routeId ?? '';
  if (id.endsWith('/[id]')) return 'detail';
  if (id.endsWith('/customers') || id.endsWith('/employees')) return 'list';
  if (id.endsWith('/profile')) return 'profile';
  if (id.endsWith('(authenticated)')) return 'home';
  return 'generic';
});
</script>

<!-- The shape of the page being loaded, so nothing jumps when it arrives. -->
<div class="flex flex-1 flex-col" aria-busy="true" data-testid="page-skeleton">
    <span class="sr-only" role="status">{t.app.common.loading}</span>

    <div class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Skeleton class="size-7" />
        <Skeleton class="mx-2 h-4 w-px" />
        <Skeleton class="h-4 w-48" />
    </div>

    <div class="flex flex-1 flex-col gap-4 p-4">
        {#if shape === 'home'}
            <div class="grid auto-rows-min gap-4 md:grid-cols-3">
                {#each [0, 1, 2] as i (i)}
                    <div class="flex flex-col gap-3 rounded-xl bg-muted/50 p-6">
                        <Skeleton class="h-4 w-24" />
                        <Skeleton class="h-8 w-20" />
                    </div>
                {/each}
            </div>
            <div class="flex flex-col gap-3 rounded-xl bg-muted/50 p-6">
                <Skeleton class="h-4 w-40" />
                <Skeleton class="h-40 w-full" />
            </div>
            <div class="flex flex-col gap-3 rounded-xl bg-muted/50 p-6">
                {#each [0, 1, 2, 3] as i (i)}
                    <Skeleton class="h-5 w-full" />
                {/each}
            </div>
        {:else if shape === 'list'}
            <div class="flex flex-col gap-4 rounded-xl bg-muted/50 p-6">
                <div class="flex flex-wrap items-end gap-2">
                    <Skeleton class="h-9 w-56" />
                    <Skeleton class="h-9 w-36" />
                    <Skeleton class="h-8 w-16" />
                </div>
                <div class="flex flex-col gap-3">
                    <Skeleton class="h-6 w-full" />
                    {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
                        <Skeleton class="h-9 w-full" />
                    {/each}
                </div>
                <div class="flex items-center justify-between">
                    <Skeleton class="h-4 w-24" />
                    <Skeleton class="h-8 w-40" />
                </div>
            </div>
        {:else if shape === 'detail'}
            <div class="flex max-w-2xl flex-col gap-4 rounded-xl border p-6">
                <Skeleton class="h-6 w-56" />
                {#each [0, 1, 2, 3] as i (i)}
                    <div class="flex justify-between gap-4">
                        <Skeleton class="h-4 w-28" />
                        <Skeleton class="h-4 w-40" />
                    </div>
                {/each}
            </div>
        {:else if shape === 'profile'}
            <div class="flex items-center gap-4 rounded-xl bg-muted/50 p-6">
                <Skeleton class="size-16 rounded-full" />
                <div class="flex flex-col gap-2">
                    <Skeleton class="h-5 w-40" />
                    <Skeleton class="h-4 w-56" />
                </div>
            </div>
            {#each [0, 1, 2] as i (i)}
                <div class="flex flex-col gap-3 rounded-xl bg-muted/50 p-6">
                    <Skeleton class="h-5 w-32" />
                    <Skeleton class="h-9 w-full max-w-md" />
                </div>
            {/each}
        {:else}
            <div class="flex flex-col gap-3 rounded-xl bg-muted/50 p-6">
                {#each [0, 1, 2, 3] as i (i)}
                    <Skeleton class="h-5 w-full" />
                {/each}
            </div>
        {/if}
    </div>
</div>
