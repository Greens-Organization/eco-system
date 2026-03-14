<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbSeparator,
    SidebarTrigger,
  } from '@pack/design-system-svelte'
  import LanguageSelector from './language-selector.svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    pages?: string[]
    page: string
    children?: Snippet
  }

  let { pages = [], page, children }: Props = $props()
</script>

<header class="flex h-16 shrink-0 items-center gap-2 border-b px-4" data-slot="header">
  <SidebarTrigger class="-ml-1" />

  <div class="mx-2 h-4 w-px bg-border" role="separator" aria-orientation="vertical"></div>

  <Breadcrumb class="flex-1">
    {#each pages as p, i (i)}
      <BreadcrumbItem href="#">{p}</BreadcrumbItem>
      <BreadcrumbSeparator />
    {/each}
    <BreadcrumbItem current>{page}</BreadcrumbItem>
  </Breadcrumb>

  <div class="ml-auto flex items-center gap-2">
    <LanguageSelector />
    {@render children?.()}
  </div>
</header>
