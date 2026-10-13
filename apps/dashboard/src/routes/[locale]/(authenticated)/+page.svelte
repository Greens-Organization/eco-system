<script lang="ts">
import Activity from '@lucide/svelte/icons/activity';
import Clock from '@lucide/svelte/icons/clock';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Users from '@lucide/svelte/icons/users';
import { formatCurrency, formatNumber } from '@pack/i18n';
import Header from '#lib/components/header.svelte';
import SignupsChart from '#lib/components/signups-chart.svelte';
import { useLocale, useTranslation } from '#lib/i18n/context.svelte.js';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const t = useTranslation();
const locale = useLocale();

const stats = $derived(data.stats);
const signupsTotal = $derived(
  stats ? stats.signups.reduce((sum, point) => sum + point.count, 0) : 0
);
const cardClass =
  'aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between';
const linkCardClass = `${cardClass} transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;
</script>

<Header page={t.app.navigation.dashboard} />

<div class="flex flex-1 flex-col gap-4 p-4">
    {#if !stats}
        <p class="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {t.app.dashboard.loadFailed}
        </p>
    {/if}

    <!-- Stats Grid -->
    <div class="grid auto-rows-min gap-4 md:grid-cols-3">
        <a href="/{locale}/customers" class={linkCardClass}>
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-muted-foreground">
                    {t.app.dashboard.totalUsers}
                </h3>
                <Users class="size-4 text-muted-foreground" />
            </div>
            <div class="text-2xl font-bold">
                {stats ? formatNumber(stats.totalUsers, locale) : "—"}
            </div>
        </a>

        <a href="/{locale}/customers?status=active" class={linkCardClass}>
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-muted-foreground">
                    {t.app.dashboard.activeUsers}
                </h3>
                <Activity class="size-4 text-muted-foreground" />
            </div>
            <div class="text-2xl font-bold">
                {stats ? formatNumber(stats.activeUsers, locale) : "—"}
            </div>
        </a>

        <div class={cardClass}>
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-muted-foreground">
                    {t.app.dashboard.totalRevenue}
                </h3>
                <DollarSign class="size-4 text-muted-foreground" />
            </div>
            <div class="text-2xl font-bold">
                {stats ? formatCurrency(stats.totalRevenue, locale) : "—"}
            </div>
        </div>
    </div>

    {#if stats}
        <div class="rounded-xl bg-muted/50 p-6">
            <div class="mb-4 flex items-center gap-2">
                <TrendingUp class="size-5" />
                <h2 class="text-lg font-semibold">{t.app.dashboard.signups}</h2>
            </div>
            <SignupsChart
                series={stats.signups}
                {locale}
                summary={t.app.dashboard.signupsSummary.replace('{total}', formatNumber(signupsTotal, locale))}
            />
        </div>
    {/if}

    <!-- Recent Activity -->
    <div class="flex-1 rounded-xl bg-muted/50 p-6">
        <div class="flex items-center gap-2 mb-4">
            <Clock class="size-5" />
            <h2 class="text-lg font-semibold">
                {t.app.dashboard.recentActivity}
            </h2>
        </div>
        <div class="space-y-4">
            {#if stats?.recentActivity.length}
                {#each stats.recentActivity as activity, i (activity.id)}
                    <div
                        class="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 border-border/50"
                    >
                        <div class="space-y-1">
                            <p class="text-sm font-medium leading-none">
                                {activity.user}
                            </p>
                            <p class="text-sm text-muted-foreground">
                                {t.app.dashboard.actions[activity.action]}
                            </p>
                        </div>
                        <div class="text-sm text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleDateString(
                                locale,
                                {
                                    hour: "numeric",
                                    minute: "numeric",
                                },
                            )}
                        </div>
                    </div>
                {/each}
            {:else}
                <p class="text-muted-foreground">
                    {t.app.dashboard.noActivity}
                </p>
            {/if}
        </div>
    </div>
</div>
