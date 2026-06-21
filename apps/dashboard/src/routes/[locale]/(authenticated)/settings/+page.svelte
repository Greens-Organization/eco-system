<script lang="ts">
import Moon from '@lucide/svelte/icons/moon';
import Sun from '@lucide/svelte/icons/sun';
import { Badge } from '@pack/design-system/components/ui/badge';
import { mode, toggleMode } from 'mode-watcher';
import { page } from '$app/state';
import Header from '$lib/components/header.svelte';
import LanguageSelector from '$lib/components/language-selector.svelte';
import { useTranslation } from '$lib/i18n/context.svelte';

const t = useTranslation();

const user = $derived(page.data.user);

const sectionClass = 'rounded-xl bg-muted/50 p-6 space-y-4';
const rowClass = 'flex items-center justify-between gap-4';
</script>

<Header pages={[t.app.navigation.dashboard]} page={t.app.navigation.settings} />

<div class="flex flex-1 flex-col gap-4 p-4">
    <!-- Appearance -->
    <div class={sectionClass}>
        <div>
            <h2 class="text-lg font-semibold">{t.app.settings.appearance}</h2>
            <p class="text-sm text-muted-foreground">
                {t.app.settings.appearanceDescription}
            </p>
        </div>
        <div class={rowClass}>
            <span class="text-sm font-medium">{t.app.settings.theme}</span>
            <button
                type="button"
                onclick={toggleMode}
                class="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {#if mode.current === "light"}
                    <Sun class="size-4" />
                {:else}
                    <Moon class="size-4" />
                {/if}
                <span>{t.app.sidebar.changeTheme}</span>
            </button>
        </div>
    </div>

    <!-- Language -->
    <div class={sectionClass}>
        <div>
            <h2 class="text-lg font-semibold">{t.app.settings.language}</h2>
            <p class="text-sm text-muted-foreground">
                {t.app.settings.languageDescription}
            </p>
        </div>
        <div class={rowClass}>
            <span class="text-sm font-medium">{t.app.common.selectLanguage}</span
            >
            <LanguageSelector />
        </div>
    </div>

    <!-- Account -->
    <div class={sectionClass}>
        <div>
            <h2 class="text-lg font-semibold">{t.app.settings.account}</h2>
            <p class="text-sm text-muted-foreground">
                {t.app.settings.accountDescription}
            </p>
        </div>
        <div class={rowClass}>
            <span class="text-sm font-medium">{t.app.auth.email}</span>
            {#if user?.email}
                <Badge variant="outline">{user.email}</Badge>
            {:else}
                <span class="text-sm text-muted-foreground">—</span>
            {/if}
        </div>
    </div>
</div>
