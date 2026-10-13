<script lang="ts">
import * as Card from '@pack/design-system/components/ui/card';
import Header from '$lib/components/header.svelte';
import StatusBadge from '$lib/components/list/status-badge.svelte';
import { useLocale, useTranslation } from '$lib/i18n/context.svelte';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const t = useTranslation();
const locale = useLocale();
const employee = $derived(data.employee);
const rowClass =
  'flex items-center justify-between gap-4 py-2 border-b last:border-0 border-border/50 text-sm';
</script>

<Header
    crumbs={[
        { label: t.app.navigation.dashboard, href: `/${locale}` },
        { label: t.app.employees.title, href: `/${locale}/employees` },
    ]}
    page={employee.name}
/>

<div class="flex flex-1 flex-col gap-4 p-4">
    <Card.Root class="max-w-2xl">
        <Card.Header>
            <Card.Title>{employee.name}</Card.Title>
            <Card.Description>{employee.role}</Card.Description>
            <Card.Action>
                <StatusBadge status={employee.status} label={t.app.employees.status[employee.status]} />
            </Card.Action>
        </Card.Header>
        <Card.Content>
            <div class={rowClass}>
                <span class="font-medium">{t.app.employees.columns.email}</span>
                <span class="text-muted-foreground">{employee.email}</span>
            </div>
            <div class={rowClass}>
                <span class="font-medium">{t.app.employees.columns.department}</span>
                <span class="text-muted-foreground">{employee.department}</span>
            </div>
            <div class={rowClass}>
                <span class="font-medium">{t.app.list.id}</span>
                <span class="font-mono text-xs text-muted-foreground">{employee.id}</span>
            </div>
        </Card.Content>
        <Card.Footer>
            <a href="/{locale}/employees" class="text-sm font-medium text-primary hover:underline">
                ← {t.app.list.back}
            </a>
        </Card.Footer>
    </Card.Root>
</div>
