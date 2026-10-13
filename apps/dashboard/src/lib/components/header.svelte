<script lang="ts">
import * as Breadcrumb from '@pack/design-system/components/ui/breadcrumb';
import * as Sidebar from '@pack/design-system/components/ui/sidebar';
import type { Snippet } from 'svelte';
import LanguageSelector from './language-selector.svelte';

export type Crumb = { label: string; href: string };

interface Props {
  /** The trail above this page, each a real link. */
  crumbs?: Crumb[];
  /** This page: the last breadcrumb and the document title. */
  page: string;
  children?: Snippet;
}

let { crumbs = [], page, children }: Props = $props();
</script>

<svelte:head>
    <title>{page} · eco-system</title>
</svelte:head>

<header
    class="flex h-16 shrink-0 items-center gap-2 border-b px-4"
    data-slot="header"
>
    <Sidebar.Trigger class="-ml-1" />

    <div
        class="mx-2 h-4 w-px bg-border"
        role="separator"
        aria-orientation="vertical"
    ></div>

    <Breadcrumb.Root class="flex-1">
        <Breadcrumb.List>
            {#each crumbs as crumb (crumb.href)}
                <Breadcrumb.Item>
                    <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
            {/each}
            <Breadcrumb.Item>
                <Breadcrumb.Page>{page}</Breadcrumb.Page>
            </Breadcrumb.Item>
        </Breadcrumb.List>
    </Breadcrumb.Root>

    <div class="ml-auto flex items-center gap-2">
        <LanguageSelector />
        {@render children?.()}
    </div>
</header>
