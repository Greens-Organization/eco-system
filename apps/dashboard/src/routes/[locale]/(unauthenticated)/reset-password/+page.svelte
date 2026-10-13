<script lang="ts">
import { Button } from '@pack/design-system/components/ui/button';
import { useLocale, useTranslation } from '#lib/i18n/context.svelte.js';
import { enhance } from '$app/forms';
import type { PageData } from './$types';

interface Props {
  data: PageData;
  form?: { error?: string; invalidLink?: boolean } | null;
}

let { data, form }: Props = $props();
const t = useTranslation();
const locale = useLocale();
let loading = $state(false);
const invalid = $derived(!data.token || form?.invalidLink);
const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head>
    <title>{t.app.auth.reset.title} · eco-system</title>
</svelte:head>

<div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2 text-center">
        <h1 class="text-2xl font-bold">{t.app.auth.reset.title}</h1>
        <p class="text-sm text-muted-foreground">{t.app.auth.reset.description}</p>
    </div>

    {#if invalid}
        <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {t.app.auth.reset.invalidLink}
        </p>
        <a href="/{locale}/forgot-password" class="text-center text-sm font-medium text-primary hover:underline">
            {t.app.auth.reset.requestNew}
        </a>
    {:else}
        <form
            method="POST"
            use:enhance={() => {
                loading = true;
                return ({ update }) => {
                    loading = false;
                    update();
                };
            }}
            class="flex flex-col gap-4"
        >
            <input type="hidden" name="token" value={data.token} />
            <div class="flex flex-col gap-1.5">
                <label for="new-password" class="text-sm font-medium">{t.app.auth.reset.newPassword}</label>
                <input id="new-password" name="newPassword" type="password" required minlength={8} maxlength={128} autocomplete="new-password" class={inputClass} />
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="confirm-password" class="text-sm font-medium">{t.app.auth.reset.confirmPassword}</label>
                <input id="confirm-password" name="confirmPassword" type="password" required minlength={8} maxlength={128} autocomplete="new-password" class={inputClass} />
            </div>
            {#if form?.error}
                <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{form.error}</p>
            {/if}
            <Button type="submit" disabled={loading} class="w-full">
                {loading ? t.app.common.loading : t.app.auth.reset.submit}
            </Button>
        </form>
    {/if}
</div>
