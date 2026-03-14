<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { cn } from '../../../utils/cn'
  import { buttonVariants, type ButtonVariants } from './index'

  interface Props extends HTMLButtonAttributes, ButtonVariants {
    href?: string
  }

  let {
    class: className,
    variant,
    size,
    radius,
    mode,
    href,
    children,
    ...props
  }: Props = $props()

  const classes = $derived(cn(buttonVariants({ variant, size, radius, mode }), className))
</script>

{#if href}
  <a {href} class={classes} data-slot="button" {...props}>
    {@render children?.()}
  </a>
{:else}
  <button class={classes} data-slot="button" {...props}>
    {@render children?.()}
  </button>
{/if}
