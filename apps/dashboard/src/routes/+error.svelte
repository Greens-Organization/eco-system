<script lang="ts">
import { Button } from '@pack/design-system/components/ui/button';
import { defaultLocale } from '@pack/i18n';
import { page } from '$app/state';

/**
 * Root-level error boundary. SvelteKit's `respond_with_error` only
 * mounts the *root* layout + error pair when no route matches a 404
 * (see `@sveltejs/kit/src/runtime/server/page/respond_with_error.js`),
 * so an `[locale]/+error.svelte` would never render for path-not-found
 * cases. Hence: this lives at the root.
 *
 * Reads `locale` and `dictionary` from `page.data` (populated by
 * `+layout.server.ts` from `event.locals`, which `localeHandle` and
 * `i18nHandle` set during the request handle chain). Falls back to
 * defaults if data is unavailable for any reason.
 */
const locale = $derived(page.data.locale ?? defaultLocale);
const dict = $derived(page.data.dictionary);

const copy = $derived.by(() => {
  const status = page.status;
  const errors = dict?.app.errors;
  if (!errors) {
    return { title: 'Page not found', description: '' };
  }
  if (status === 404) {
    return { title: errors.notFound, description: errors.notFoundDescription };
  }
  if (status === 401 || status === 403) {
    return { title: errors.unauthorized, description: page.error?.message ?? '' };
  }
  return {
    title: errors.serverError,
    description: page.error?.message ?? '',
  };
});

const backHomeLabel = $derived(dict?.app.errors.backHome ?? 'Back to home');
const refLabel = $derived(dict?.app.errors.reference ?? 'ref');
</script>

<svelte:head>
    <title>{page.status} | eco-system</title>
</svelte:head>

<div
    class="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center"
>
    <p class="text-7xl font-bold tracking-tight text-muted-foreground/40">
        {page.status}
    </p>

    <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold tracking-tight">
            {copy.title}
        </h1>
        {#if copy.description}
            <p class="max-w-md text-sm text-muted-foreground">
                {copy.description}
            </p>
        {/if}
    </div>

    {#if page.error?.errorId}
        <p class="font-mono text-xs text-muted-foreground/70">
            {refLabel}: {page.error.errorId}
        </p>
    {/if}

    <Button href="/{locale}">
        {backHomeLabel}
    </Button>
</div>
