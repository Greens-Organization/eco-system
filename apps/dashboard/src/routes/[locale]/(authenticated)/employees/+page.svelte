<script lang="ts">
import * as Table from '@pack/design-system/components/ui/table';
import { formatNumber } from '@pack/i18n';
import Header from '$lib/components/header.svelte';
import ListPagination from '$lib/components/list/list-pagination.svelte';
import ListToolbar from '$lib/components/list/list-toolbar.svelte';
import StatusBadge from '$lib/components/list/status-badge.svelte';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';
import { EMPLOYEE_STATUSES } from '$lib/resources';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const t = useTranslation();
const locale = useLocale();

const statuses = $derived(
  EMPLOYEE_STATUSES.map((value) => ({
    value,
    label: t.app.employees.status[value],
  }))
);
</script>

<Header
    crumbs={[{ label: t.app.navigation.dashboard, href: `/${locale}` }]}
    page={t.app.employees.title}
/>

<div class="flex flex-1 flex-col gap-4 p-4">
    <div class="flex flex-col gap-4 rounded-xl bg-muted/50 p-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <ListToolbar
                q={data.query.q}
                status={data.query.status}
                {statuses}
                clearHref="/{locale}/employees"
            />
            {#if data.employees}
                <span class="text-sm text-muted-foreground">
                    {t.app.list.results.replace('{count}', formatNumber(data.employees.total, locale))}
                </span>
            {/if}
        </div>

        {#if !data.employees}
            <p class="text-sm text-destructive" role="alert">{t.app.list.loadFailed}</p>
        {:else if data.employees.employees.length === 0}
            <p class="text-sm text-muted-foreground">
                {data.query.q || data.query.status ? t.app.list.noResults : t.app.employees.empty}
            </p>
        {:else}
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>{t.app.employees.columns.name}</Table.Head>
                        <Table.Head>{t.app.employees.columns.role}</Table.Head>
                        <Table.Head>{t.app.employees.columns.department}</Table.Head>
                        <Table.Head>{t.app.employees.columns.status}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each data.employees.employees as employee (employee.id)}
                        <Table.Row>
                            <Table.Cell class="font-medium">
                                <a href="/{locale}/employees/{employee.id}" class="hover:underline">
                                    {employee.name}
                                </a>
                                <div class="text-xs font-normal text-muted-foreground">{employee.email}</div>
                            </Table.Cell>
                            <Table.Cell>{employee.role}</Table.Cell>
                            <Table.Cell class="text-muted-foreground">{employee.department}</Table.Cell>
                            <Table.Cell>
                                <StatusBadge
                                    status={employee.status}
                                    label={t.app.employees.status[employee.status]}
                                />
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
            <ListPagination page={data.employees.page} pages={data.employees.pages} />
        {/if}
    </div>
</div>
