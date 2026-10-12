<script lang="ts">
import { Button } from '@pack/design-system/components/ui/button';
import { enhance } from '$app/forms';
import { page } from '$app/state';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';

interface Props {
  form?: {
    method?: 'totp' | 'backup';
    error?: string;
    requestId?: string;
  } | null;
}

let { form }: Props = $props();

const t = useTranslation();
const locale = useLocale();

// `?method=backup` switches the form, so it also works without JavaScript.
const method = $derived(
  form?.method ??
    (page.url.searchParams.get('method') === 'backup' ? 'backup' : 'totp')
);

let loading = $state(false);

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-center font-mono text-base tracking-widest shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head>
    <title>{t.app.auth.twoFactor.title} | eco-system</title>
</svelte:head>

<div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2 text-center">
        <h1 class="text-2xl font-bold">{t.app.auth.twoFactor.title}</h1>
        <p class="text-sm text-muted-foreground">
            {method === "totp"
                ? t.app.auth.twoFactor.description
                : t.app.auth.twoFactor.backupDescription}
        </p>
    </div>

    <form
        method="POST"
        action="?/{method}"
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
            <label for="code" class="text-sm font-medium">
                {method === "totp"
                    ? t.app.auth.twoFactor.code
                    : t.app.auth.twoFactor.backupCode}
            </label>
            {#if method === "totp"}
                <input
                    id="code"
                    name="code"
                    required
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    pattern="[0-9 ]*"
                    maxlength={7}
                    placeholder="000000"
                    class={inputClass}
                />
            {:else}
                <input
                    id="code"
                    name="code"
                    required
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    class={inputClass}
                />
            {/if}
        </div>

        {#if form?.error}
            <div
                class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
            >
                <p>{form.error}</p>
                {#if form.requestId}
                    <p class="mt-1 font-mono text-xs opacity-70">
                        {t.app.errors.reference}: {form.requestId}
                    </p>
                {/if}
            </div>
        {/if}

        <Button type="submit" disabled={loading} class="w-full">
            {loading ? t.app.common.loading : t.app.auth.twoFactor.verify}
        </Button>
    </form>

    <div class="flex flex-col gap-2 text-center text-sm">
        <a
            href={method === "totp" ? "?method=backup" : "?method=totp"}
            class="font-medium text-primary hover:underline"
            data-sveltekit-replacestate
        >
            {method === "totp"
                ? t.app.auth.twoFactor.useBackup
                : t.app.auth.twoFactor.useApp}
        </a>
        <a
            href="/{locale}/sign-in"
            class="text-muted-foreground hover:underline"
        >
            {t.app.auth.twoFactor.backToSignIn}
        </a>
    </div>
</div>
