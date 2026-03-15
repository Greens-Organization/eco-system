<script lang="ts">
import * as Breadcrumb from '@pack/design-system-sv/components/ui/breadcrumb';
import * as Sidebar from '@pack/design-system-sv/components/ui/sidebar';
import type { Snippet } from 'svelte';
import LanguageSelector from './language-selector.svelte';

interface Props {
  pages?: string[];
  page: string;
  children?: Snippet;
}

let { pages = [], page, children }: Props = $props();
</script>

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
            {#each pages as p, i (i)}
                <Breadcrumb.Item>
                    <Breadcrumb.Link href="#">{p}</Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
            {/each}
            <Breadcrumb.Item>{page}</Breadcrumb.Item>
        </Breadcrumb.List>
    </Breadcrumb.Root>

    <div class="ml-auto flex items-center gap-2">
        <LanguageSelector />
        {@render children?.()}
    </div>
</header>
