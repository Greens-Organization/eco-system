<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { cn } from '../../../utils/cn'

  interface Props extends HTMLInputAttributes {
    label?: string
    error?: string
  }

  let { class: className, label, error, id, ...props }: Props = $props()

  const inputId = id ?? crypto.randomUUID()
</script>

<div class="flex flex-col gap-1.5" data-slot="input-wrapper">
  {#if label}
    <label
      for={inputId}
      class="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {label}
    </label>
  {/if}

  <input
    id={inputId}
    class={cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-destructive/60 focus-visible:ring-destructive/30',
      className
    )}
    aria-invalid={error ? 'true' : undefined}
    data-slot="input"
    {...props}
  />

  {#if error}
    <p class="text-xs text-destructive" role="alert">{error}</p>
  {/if}
</div>
