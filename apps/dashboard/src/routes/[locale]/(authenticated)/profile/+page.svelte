<script lang="ts">
import { genericAvatar } from '@pack/design-system/lib/utils';
import { page } from '$app/state';
import Header from '$lib/components/header.svelte';
import { useTranslation } from '$lib/i18n/context.svelte';

const t = useTranslation();

const user = $derived(page.data.user);

const avatarSrc = $derived(
  user?.image ?? genericAvatar(user?.name ?? user?.email ?? 'U')
);

const rowClass =
  'flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0 border-border/50';
</script>

<Header pages={[t.app.navigation.dashboard]} page={t.app.profile.title} />

<div class="flex flex-1 flex-col gap-4 p-4">
    <div class="rounded-xl bg-muted/50 p-6">
        <div class="flex items-center gap-4">
            <img
                src={avatarSrc}
                alt={user?.name ?? t.app.common.user}
                class="size-16 shrink-0 rounded-full object-cover"
            />
            <div class="space-y-1">
                <h2 class="text-lg font-semibold leading-none">
                    {user?.name ?? "—"}
                </h2>
                <p class="text-sm text-muted-foreground">
                    {user?.email ?? "—"}
                </p>
            </div>
        </div>
    </div>

    <div class="rounded-xl bg-muted/50 p-6">
        <h3 class="text-base font-semibold mb-4">
            {t.app.profile.description}
        </h3>
        <div class="space-y-3 text-sm">
            <div class={rowClass}>
                <span class="font-medium">{t.app.profile.name}</span>
                <span class="text-muted-foreground">{user?.name ?? "—"}</span>
            </div>
            <div class={rowClass}>
                <span class="font-medium">{t.app.profile.email}</span>
                <span class="text-muted-foreground">{user?.email ?? "—"}</span>
            </div>
            <div class={rowClass}>
                <span class="font-medium">{t.app.profile.accountId}</span>
                <span class="text-muted-foreground font-mono text-xs">
                    {user?.id ?? "—"}
                </span>
            </div>
        </div>
    </div>
</div>
