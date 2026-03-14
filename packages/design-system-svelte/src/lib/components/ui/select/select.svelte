<script lang="ts">
  import { Select } from 'bits-ui'
  import { Check, ChevronsUpDown } from 'lucide-svelte'
  import type { Snippet } from 'svelte'
  import { cn } from '../../../utils/cn'

  interface SelectOption {
    value: string
    label: string
    disabled?: boolean
  }

  interface Props {
    options: SelectOption[]
    value?: string
    placeholder?: string
    class?: string
    disabled?: boolean
    onValueChange?: (value: string) => void
    children?: Snippet
  }

  let {
    options,
    value = $bindable(),
    placeholder = 'Select...',
    class: className,
    disabled,
    onValueChange,
  }: Props = $props()

  const selected = $derived(options.find((o) => o.value === value))
</script>

<Select.Root bind:value {onValueChange} {disabled}>
  <Select.Trigger
    class={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs',
      'placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    data-slot="select-trigger"
  >
    <span class={cn(!selected && 'text-muted-foreground')}>
      {selected?.label ?? placeholder}
    </span>
    <ChevronsUpDown class="size-4 opacity-50 shrink-0" />
  </Select.Trigger>

  <Select.Portal>
    <Select.Content
      class="relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      sideOffset={4}
    >
      <Select.Viewport class="p-1">
        {#each options as option (option.value)}
          <Select.Item
            value={option.value}
            label={option.label}
            disabled={option.disabled}
            class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50"
          >
            <Select.ItemIndicator class="absolute left-2 flex size-3.5 items-center justify-center">
              <Check class="size-4" />
            </Select.ItemIndicator>
            {option.label}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
