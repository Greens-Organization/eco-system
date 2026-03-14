<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface Props {
    class?: string
    href?: string
    current?: boolean
    children?: Snippet
  }

  let { class: className, href, current = false, children }: Props = $props()
</script>

<li class={cn('inline-flex items-center gap-1.5', className)} data-slot="breadcrumb-item">
  {#if current}
    <span
      aria-current="page"
      class="font-normal text-foreground"
      data-slot="breadcrumb-page"
    >
      {@render children?.()}
    </span>
  {:else if href}
    <a
      {href}
      class="transition-colors hover:text-foreground"
      data-slot="breadcrumb-link"
    >
      {@render children?.()}
    </a>
  {:else}
    {@render children?.()}
  {/if}
</li>
