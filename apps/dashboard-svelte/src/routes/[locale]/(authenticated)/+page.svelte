<script lang="ts">
  import { Activity, Clock, DollarSign, Users } from 'lucide-svelte'
  import { useTranslation, useLocale } from '$lib/i18n/context.svelte'
  import Header from '$lib/components/header.svelte'

  interface Props {
    data: {
      stats: {
        totalUsers: number
        activeUsers: number
        totalRevenue: number
        recentActivity: Array<{
          id: string
          user: string
          action: string
          timestamp: string
        }>
      } | null
    }
  }

  let { data }: Props = $props()

  const t = useTranslation()
  const locale = useLocale()

  const stats = $derived(data.stats)
</script>

<Header
  pages={[t.app.navigation.dashboard]}
  page={t.app.dashboard.dataFetching}
/>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
  <!-- Stats Grid -->
  <div class="grid auto-rows-min gap-4 md:grid-cols-3">
    <div class="aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-muted-foreground">{t.app.dashboard.totalUsers}</h3>
        <Users class="size-4 text-muted-foreground" />
      </div>
      <div class="text-2xl font-bold">
        {stats?.totalUsers.toLocaleString(locale) ?? '—'}
      </div>
    </div>

    <div class="aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-muted-foreground">{t.app.dashboard.activeUsers}</h3>
        <Activity class="size-4 text-muted-foreground" />
      </div>
      <div class="text-2xl font-bold">
        {stats?.activeUsers.toLocaleString(locale) ?? '—'}
      </div>
    </div>

    <div class="aspect-video rounded-xl bg-muted/50 p-6 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-muted-foreground">{t.app.dashboard.totalRevenue}</h3>
        <DollarSign class="size-4 text-muted-foreground" />
      </div>
      <div class="text-2xl font-bold">
        {stats
          ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(stats.totalRevenue)
          : '—'}
      </div>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="flex-1 rounded-xl bg-muted/50 p-6">
    <div class="flex items-center gap-2 mb-4">
      <Clock class="size-5" />
      <h2 class="text-lg font-semibold">{t.app.dashboard.recentActivity}</h2>
    </div>
    <div class="space-y-4">
      {#if stats?.recentActivity.length}
        {#each stats.recentActivity as activity, i (activity.id)}
          <div
            class="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 border-border/50"
          >
            <div class="space-y-1">
              <p class="text-sm font-medium leading-none">{activity.user}</p>
              <p class="text-sm text-muted-foreground">{activity.action}</p>
            </div>
            <div class="text-sm text-muted-foreground">
              {new Date(activity.timestamp).toLocaleDateString(locale, {
                hour: 'numeric',
                minute: 'numeric',
              })}
            </div>
          </div>
        {/each}
      {:else}
        <p class="text-muted-foreground">No activity found.</p>
      {/if}
    </div>
  </div>
</div>
