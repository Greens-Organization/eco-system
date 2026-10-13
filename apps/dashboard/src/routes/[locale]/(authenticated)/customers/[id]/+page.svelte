<script lang="ts">
import * as Card from '@pack/design-system/components/ui/card';
import Header from '#lib/components/header.svelte';
import StatusBadge from '#lib/components/list/status-badge.svelte';
import { useLocale, useTranslation } from '#lib/i18n/context.svelte.js';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const t = useTranslation();
const locale = useLocale();
const customer = $derived(data.customer);
const since = $derived(
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(customer.createdAt))
);
const rowClass =
  'flex items-center justify-between gap-4 py-2 border-b last:border-0 border-border/50 text-sm';
</script>

<Header
    crumbs={[
        { label: t.app.navigation.dashboard, href: `/${locale}` },
        { label: t.app.customers.title, href: `/${locale}/customers` },
    ]}
    page={customer.name}
/>

<div class="flex flex-1 flex-col gap-4 p-4">
    <Card.Root class="max-w-2xl">
        <Card.Header>
            <Card.Title>{customer.name}</Card.Title>
            <Card.Description>{t.app.customers.detailTitle}</Card.Description>
            <Card.Action>
                <StatusBadge status={customer.status} label={t.app.customers.status[customer.status]} />
            </Card.Action>
        </Card.Header>
        <Card.Content>
            <div class={rowClass}>
                <span class="font-medium">{t.app.customers.columns.email}</span>
                <span class="text-muted-foreground">{customer.email}</span>
            </div>
            <div class={rowClass}>
                <span class="font-medium">{t.app.customers.columns.createdAt}</span>
                <span class="text-muted-foreground">{since}</span>
            </div>
            <div class={rowClass}>
                <span class="font-medium">{t.app.list.id}</span>
                <span class="font-mono text-xs text-muted-foreground">{customer.id}</span>
            </div>
        </Card.Content>
        <Card.Footer>
            <a href="/{locale}/customers" class="text-sm font-medium text-primary hover:underline">
                ← {t.app.list.back}
            </a>
        </Card.Footer>
    </Card.Root>
</div>
