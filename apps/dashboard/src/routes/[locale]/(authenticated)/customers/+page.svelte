<script lang="ts">
import * as Table from '@pack/design-system/components/ui/table';
import { formatNumber } from '@pack/i18n';
import Header from '#lib/components/header.svelte';
import ListPagination from '#lib/components/list/list-pagination.svelte';
import ListToolbar from '#lib/components/list/list-toolbar.svelte';
import StatusBadge from '#lib/components/list/status-badge.svelte';
import { useLocale, useTranslation } from '#lib/i18n/context.svelte.js';
import { CUSTOMER_STATUSES } from '#lib/resources.js';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const t = useTranslation();
const locale = useLocale();

const statuses = $derived(
  CUSTOMER_STATUSES.map((value) => ({
    value,
    label: t.app.customers.status[value],
  }))
);
const date = (iso: string) =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(iso));
</script>

<Header
    crumbs={[{ label: t.app.navigation.dashboard, href: `/${locale}` }]}
    page={t.app.customers.title}
/>

<div class="flex flex-1 flex-col gap-4 p-4">
    <div class="flex flex-col gap-4 rounded-xl bg-muted/50 p-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <ListToolbar
                q={data.query.q}
                status={data.query.status}
                {statuses}
                clearHref="/{locale}/customers"
            />
            {#if data.customers}
                <span class="text-sm text-muted-foreground">
                    {t.app.list.results.replace('{count}', formatNumber(data.customers.total, locale))}
                </span>
            {/if}
        </div>

        {#if !data.customers}
            <p class="text-sm text-destructive" role="alert">{t.app.list.loadFailed}</p>
        {:else if data.customers.customers.length === 0}
            <p class="text-sm text-muted-foreground">
                {data.query.q || data.query.status ? t.app.list.noResults : t.app.customers.empty}
            </p>
        {:else}
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>{t.app.customers.columns.name}</Table.Head>
                        <Table.Head>{t.app.customers.columns.email}</Table.Head>
                        <Table.Head>{t.app.customers.columns.status}</Table.Head>
                        <Table.Head class="text-right">{t.app.customers.columns.createdAt}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each data.customers.customers as customer (customer.id)}
                        <Table.Row>
                            <Table.Cell class="font-medium">
                                <a href="/{locale}/customers/{customer.id}" class="hover:underline">
                                    {customer.name}
                                </a>
                            </Table.Cell>
                            <Table.Cell class="text-muted-foreground">{customer.email}</Table.Cell>
                            <Table.Cell>
                                <StatusBadge
                                    status={customer.status}
                                    label={t.app.customers.status[customer.status]}
                                />
                            </Table.Cell>
                            <Table.Cell class="text-right text-muted-foreground">
                                {date(customer.createdAt)}
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
            <ListPagination page={data.customers.page} pages={data.customers.pages} />
        {/if}
    </div>
</div>
