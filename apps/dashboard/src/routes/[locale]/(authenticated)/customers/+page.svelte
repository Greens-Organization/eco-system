<script lang="ts">
import Users from '@lucide/svelte/icons/users';
import { Badge } from '@pack/design-system/components/ui/badge';
import { formatNumber } from '@pack/i18n';
import Header from '$lib/components/header.svelte';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';

interface Props {
  data: {
    customers: {
      customers: Array<{
        id: string;
        name: string;
        email: string;
        status: string;
        createdAt: string;
      }>;
      total: number;
    } | null;
  };
}

let { data }: Props = $props();

const t = useTranslation();
const locale = useLocale();

const customers = $derived(data.customers);

function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'pending') return 'secondary';
  return 'outline';
}
</script>

<Header
    pages={[t.app.navigation.dashboard]}
    page={t.app.navigation.customers}
/>

<div class="flex flex-1 flex-col gap-4 p-4">
    <div class="flex-1 rounded-xl bg-muted/50 p-6">
        <div class="flex items-center gap-2 mb-4">
            <Users class="size-5" />
            <h2 class="text-lg font-semibold">{t.app.customers.title}</h2>
            {#if customers}
                <Badge variant="secondary">
                    {formatNumber(customers.total, locale)}
                </Badge>
            {/if}
        </div>

        {#if customers?.customers.length}
            <div class="space-y-4">
                {#each customers.customers as customer (customer.id)}
                    <div
                        class="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 border-border/50"
                    >
                        <div class="space-y-1">
                            <p class="text-sm font-medium leading-none">
                                {customer.name}
                            </p>
                            <p class="text-sm text-muted-foreground">
                                {customer.email}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <Badge variant={statusVariant(customer.status)}>
                                {customer.status}
                            </Badge>
                            <span class="text-sm text-muted-foreground">
                                {new Date(
                                    customer.createdAt,
                                ).toLocaleDateString(locale)}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-muted-foreground">{t.app.customers.empty}</p>
        {/if}
    </div>
</div>
