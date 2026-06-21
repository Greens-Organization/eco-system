<script lang="ts">
import UserRound from '@lucide/svelte/icons/user-round';
import { Badge } from '@pack/design-system/components/ui/badge';
import { formatNumber } from '@pack/i18n';
import Header from '$lib/components/header.svelte';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';

interface Props {
  data: {
    employees: {
      employees: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        department: string;
        status: string;
      }>;
      total: number;
    } | null;
  };
}

let { data }: Props = $props();

const t = useTranslation();
const locale = useLocale();

const employees = $derived(data.employees);

function statusVariant(status: string): 'default' | 'outline' {
  return status === 'active' ? 'default' : 'outline';
}
</script>

<Header
    pages={[t.app.navigation.dashboard]}
    page={t.app.navigation.employees}
/>

<div class="flex flex-1 flex-col gap-4 p-4">
    <div class="flex-1 rounded-xl bg-muted/50 p-6">
        <div class="flex items-center gap-2 mb-4">
            <UserRound class="size-5" />
            <h2 class="text-lg font-semibold">{t.app.employees.title}</h2>
            {#if employees}
                <Badge variant="secondary">
                    {formatNumber(employees.total, locale)}
                </Badge>
            {/if}
        </div>

        {#if employees?.employees.length}
            <div class="space-y-4">
                {#each employees.employees as employee (employee.id)}
                    <div
                        class="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 border-border/50"
                    >
                        <div class="space-y-1">
                            <p class="text-sm font-medium leading-none">
                                {employee.name}
                            </p>
                            <p class="text-sm text-muted-foreground">
                                {employee.role} · {employee.department}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span
                                class="hidden text-sm text-muted-foreground sm:inline"
                            >
                                {employee.email}
                            </span>
                            <Badge variant={statusVariant(employee.status)}>
                                {employee.status}
                            </Badge>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-muted-foreground">{t.app.employees.empty}</p>
        {/if}
    </div>
</div>
