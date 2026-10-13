<script lang="ts">
import { Button } from '@pack/design-system/components/ui/button';
import { enhance } from '$app/forms';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';

interface Props {
  form?: { sent?: boolean; error?: string; requestId?: string } | null;
}

let { form }: Props = $props();
const t = useTranslation();
const locale = useLocale();
let loading = $state(false);
</script>

<svelte:head>
    <title>{t.app.auth.forgot.title} · eco-system</title>
</svelte:head>

<div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2 text-center">
        <h1 class="text-2xl font-bold">{t.app.auth.forgot.title}</h1>
        <p class="text-sm text-muted-foreground">{t.app.auth.forgot.description}</p>
    </div>

    {#if form?.sent}
        <p class="rounded-md bg-muted px-3 py-2 text-sm" role="status">{t.app.auth.forgot.sent}</p>
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
            <div class="flex flex-col gap-1.5">
                <label for="email" class="text-sm font-medium">{t.app.auth.email}</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autocomplete="email"
                    placeholder="you@example.com"
                    class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>
            {#if form?.error}
                <div class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    <p>{form.error}</p>
                </div>
            {/if}
            <Button type="submit" disabled={loading} class="w-full">
                {loading ? t.app.common.loading : t.app.auth.forgot.submit}
            </Button>
        </form>
    {/if}

    <p class="text-center text-sm">
        <a href="/{locale}/sign-in" class="font-medium text-primary hover:underline">{t.app.auth.forgot.back}</a>
    </p>
</div>
