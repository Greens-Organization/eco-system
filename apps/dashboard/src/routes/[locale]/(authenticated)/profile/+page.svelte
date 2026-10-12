<script lang="ts">
import Moon from '@lucide/svelte/icons/moon';
import Sun from '@lucide/svelte/icons/sun';
import { Badge } from '@pack/design-system/components/ui/badge';
import { Button } from '@pack/design-system/components/ui/button';
import { genericAvatar } from '@pack/design-system/lib/utils';
import { mode, toggleMode } from 'mode-watcher';
import { enhance } from '$app/forms';
import { page } from '$app/state';
import Header from '$lib/components/header.svelte';
import LanguageSelector from '$lib/components/language-selector.svelte';
import { useTranslation } from '$lib/i18n/context.svelte';
import type { ActionData, PageData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

const t = useTranslation();

// The enrollment (QR + backup codes) arrives once, from `enable`. Rendered
// straight from `form` (so it works without JS); `kept` holds it on screen in
// the browser while the user retries a wrong confirmation code.
type Setup = { qr: string; secret: string; backupCodes: string[] };
let kept = $state<Setup | null>(null);
$effect(() => {
  if (form && 'setup' in form && form.setup) kept = form.setup;
  // Once 2FA is turned on or off the enrollment is over.
  if (doneStep === 'confirm' || doneStep === 'disable') kept = null;
});
const setup = $derived.by(() => {
  if (doneStep === 'confirm' || doneStep === 'disable') return null;
  if (form && 'setup' in form && form.setup) return form.setup;
  return kept;
});

// Loads ran before the action changed the session, so trust a fresh result.
const doneStep = $derived(
  form && 'done' in form && form.done ? form.step : undefined
);
const twoFactorOn = $derived(
  doneStep === 'confirm' || doneStep === 'disable'
    ? doneStep === 'confirm'
    : data.twoFactorEnabled
);
const errorFor = (step: string) =>
  form && 'error' in form && form.step === step ? form.error : undefined;

let busy = $state(false);
const submit = () => {
  busy = true;
  return async ({ update }: { update: () => Promise<void> }) => {
    busy = false;
    await update();
  };
};

const deviceName = (device: {
  browser: string | null;
  system: string | null;
}) =>
  device.browser || device.system
    ? t.app.settings.devices.device
        .replace(
          '{browser}',
          device.browser ?? t.app.settings.devices.unknownBrowser
        )
        .replace('{system}', device.system ?? '?')
    : t.app.settings.devices.unknownDevice;

const inputClass =
  'flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const user = $derived(page.data.user);

const avatarSrc = $derived(
  user?.image ?? genericAvatar(user?.name ?? user?.email ?? 'U')
);
const detailRowClass =
  'flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0 border-border/50';

const sectionClass = 'rounded-xl bg-muted/50 p-6 space-y-4';
const rowClass = 'flex items-center justify-between gap-4';
</script>

<Header pages={[t.app.navigation.dashboard]} page={t.app.profile.title} />

<div class="flex flex-1 flex-col gap-4 p-4">
    <!-- Profile -->
    <div class="rounded-xl bg-muted/50 p-6">
        <div class="flex items-center gap-4">
            <img
                src={avatarSrc}
                alt={user?.name ?? t.app.common.user}
                width="64"
                height="64"
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
            <div class={detailRowClass}>
                <span class="font-medium">{t.app.profile.name}</span>
                <span class="text-muted-foreground">{user?.name ?? "—"}</span>
            </div>
            <div class={detailRowClass}>
                <span class="font-medium">{t.app.profile.email}</span>
                <span class="text-muted-foreground">{user?.email ?? "—"}</span>
            </div>
            <div class={detailRowClass}>
                <span class="font-medium">{t.app.profile.accountId}</span>
                <span class="text-muted-foreground font-mono text-xs">
                    {user?.id ?? "—"}
                </span>
            </div>
        </div>
    </div>

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

    <!-- Security -->
    <div class={sectionClass}>
        <div>
            <h2 class="text-lg font-semibold">{t.app.settings.security.title}</h2>
            <p class="text-sm text-muted-foreground">
                {t.app.settings.security.description}
            </p>
        </div>
        <div class={rowClass}>
            <span class="text-sm font-medium"
                >{t.app.settings.security.twoFactor}</span
            >
            <Badge variant={twoFactorOn ? "default" : "outline"}>
                {twoFactorOn
                    ? t.app.settings.security.on
                    : t.app.settings.security.off}
            </Badge>
        </div>

        {#if doneStep === "confirm" || doneStep === "disable"}
            <p class="text-sm text-muted-foreground" role="status">
                {doneStep === "confirm"
                    ? t.app.settings.security.enabled
                    : t.app.settings.security.disabled}
            </p>
        {/if}

        {#if twoFactorOn}
            <form
                method="POST"
                action="?/disable"
                use:enhance={submit}
                class="flex flex-col gap-2"
            >
                <label for="disable-password" class="text-sm font-medium"
                    >{t.app.settings.security.confirmPassword}</label
                >
                <input
                    id="disable-password"
                    name="password"
                    type="password"
                    required
                    autocomplete="current-password"
                    class={inputClass}
                />
                {#if errorFor("disable")}
                    <p class="text-sm text-destructive" role="alert">
                        {errorFor("disable")}
                    </p>
                {/if}
                <Button
                    type="submit"
                    variant="destructive"
                    disabled={busy}
                    class="w-fit"
                >
                    {t.app.settings.security.disable}
                </Button>
            </form>
        {:else if setup}
            <div class="flex flex-col gap-4">
                <p class="text-sm">{t.app.settings.security.scan}</p>
                <div class="w-44 rounded-md bg-white p-2 text-black">
                    {@html setup.qr}
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium"
                        >{t.app.settings.security.setupKey}</span
                    >
                    <code class="w-fit break-all rounded bg-muted px-2 py-1 text-sm"
                        >{setup.secret}</code
                    >
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium"
                        >{t.app.settings.security.backupCodes}</span
                    >
                    <p class="text-sm text-muted-foreground">
                        {t.app.settings.security.backupCodesHint}
                    </p>
                    <ul class="grid w-fit grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
                        {#each setup.backupCodes as code (code)}
                            <li>{code}</li>
                        {/each}
                    </ul>
                </div>
                <form
                    method="POST"
                    action="?/confirm"
                    use:enhance={submit}
                    class="flex flex-col gap-2"
                >
                    <label for="confirm-code" class="text-sm font-medium"
                        >{t.app.settings.security.confirmCode}</label
                    >
                    <input
                        id="confirm-code"
                        name="code"
                        required
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        pattern="[0-9 ]*"
                        maxlength={7}
                        placeholder="000000"
                        class={inputClass}
                    />
                    {#if errorFor("confirm")}
                        <p class="text-sm text-destructive" role="alert">
                            {errorFor("confirm")}
                        </p>
                    {/if}
                    <Button type="submit" disabled={busy} class="w-fit">
                        {t.app.settings.security.confirm}
                    </Button>
                </form>
            </div>
        {:else}
            <form
                method="POST"
                action="?/enable"
                use:enhance={submit}
                class="flex flex-col gap-2"
            >
                <label for="enable-password" class="text-sm font-medium"
                    >{t.app.settings.security.confirmPassword}</label
                >
                <input
                    id="enable-password"
                    name="password"
                    type="password"
                    required
                    autocomplete="current-password"
                    class={inputClass}
                />
                <!-- Without JS a failed confirmation lands here: start over. -->
                {#if errorFor("enable") ?? errorFor("confirm")}
                    <p class="text-sm text-destructive" role="alert">
                        {errorFor("enable") ?? errorFor("confirm")}
                    </p>
                {/if}
                <Button type="submit" disabled={busy} class="w-fit">
                    {t.app.settings.security.enable}
                </Button>
            </form>
        {/if}
    </div>
    <!-- Signed-in devices -->
    <div class={sectionClass}>
        <div>
            <h2 class="text-lg font-semibold">{t.app.settings.devices.title}</h2>
            <p class="text-sm text-muted-foreground">
                {t.app.settings.devices.description}
            </p>
        </div>

        {#if doneStep === "signOutDevice" || doneStep === "signOutOthers"}
            <p class="text-sm text-muted-foreground" role="status">
                {doneStep === "signOutDevice"
                    ? t.app.settings.devices.signedOutOne
                    : t.app.settings.devices.signedOutOthers}
                {t.app.settings.devices.delayNote}
            </p>
        {/if}
        {#if errorFor("signOutDevice") ?? errorFor("signOutOthers")}
            <p class="text-sm text-destructive" role="alert">
                {errorFor("signOutDevice") ?? errorFor("signOutOthers")}
            </p>
        {/if}

        {#if data.devices}
            <ul
                aria-label={t.app.settings.devices.title}
                class="divide-y divide-border rounded-md border"
            >
                {#each data.devices as device (device.id)}
                    <li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <div class="min-w-0">
                            <p class="text-sm font-medium">{deviceName(device)}</p>
                            <p class="text-xs text-muted-foreground">
                                {[
                                    device.ip,
                                    t.app.settings.devices.signedIn.replace(
                                        "{when}",
                                        device.signedInAgo,
                                    ),
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        </div>
                        {#if device.current}
                            <span class="text-xs font-medium text-primary"
                                >{t.app.settings.devices.thisDevice}</span
                            >
                        {:else}
                            <form method="POST" action="?/signOutDevice" use:enhance={submit}>
                                <input type="hidden" name="id" value={device.id} />
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    aria-label="{t.app.settings.devices.signOut}: {deviceName(device)}"
                                >
                                    {t.app.settings.devices.signOut}
                                </Button>
                            </form>
                        {/if}
                    </li>
                {/each}
            </ul>

            {#if data.devices.length > 1}
                <form method="POST" action="?/signOutOthers" use:enhance={submit}>
                    <Button type="submit" variant="outline" size="sm" disabled={busy}>
                        {t.app.settings.devices.signOutOthers}
                    </Button>
                </form>
            {/if}
        {:else}
            <p class="text-sm text-muted-foreground">
                {t.app.settings.devices.listFailed}
            </p>
        {/if}
    </div>
</div>
