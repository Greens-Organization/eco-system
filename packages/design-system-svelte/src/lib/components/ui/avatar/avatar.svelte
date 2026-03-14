<script lang="ts">
  import { Avatar } from 'bits-ui'
  import { cn } from '../../../utils/cn'

  interface Props {
    src?: string
    alt?: string
    fallback?: string
    class?: string
    size?: 'sm' | 'md' | 'lg'
  }

  let { src, alt = '', fallback = '?', class: className, size = 'md' }: Props = $props()

  const sizeClasses = {
    sm: 'size-7 text-xs',
    md: 'size-9 text-sm',
    lg: 'size-12 text-base',
  }
</script>

<Avatar.Root
  class={cn(
    'relative flex shrink-0 overflow-hidden rounded-full',
    sizeClasses[size],
    className
  )}
  data-slot="avatar"
>
  {#if src}
    <Avatar.Image class="aspect-square size-full object-cover" {src} {alt} />
  {/if}
  <Avatar.Fallback
    class="flex size-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground"
  >
    {fallback}
  </Avatar.Fallback>
</Avatar.Root>
