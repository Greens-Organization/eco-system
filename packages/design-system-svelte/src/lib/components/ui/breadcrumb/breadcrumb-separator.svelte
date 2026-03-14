<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'
  import type { Snippet } from 'svelte'

  interface Props { children?: Snippet }
  let { children }: Props = $props()
</script>

<li role="presentation" aria-hidden="true" data-slot="breadcrumb-separator">
  {#if children}
    {@render children()}
  {:else}
    <ChevronRight class="size-3.5" />
  {/if}
</li>
