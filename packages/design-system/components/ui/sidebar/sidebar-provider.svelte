<script lang="ts">
import type { HTMLAttributes } from 'svelte/elements';
import * as Tooltip from '../../../components/ui/tooltip/index.js';
import { cn, type WithElementRef } from '../../../lib/utils.js';
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
} from './constants.js';
import { setSidebar } from './context.svelte.js';

let {
  ref = $bindable(null),
  open = $bindable(true),
  onOpenChange = () => {},
  class: className,
  style,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = $props();

const sidebar = setSidebar({
  open: () => open,
  setOpen: (value: boolean) => {
    open = value;
    onOpenChange(value);

    // Remembers whether the sidebar is open across visits: a UI preference,
    // not a credential (shadcn's pattern).
    // biome-ignore lint/suspicious/noDocumentCookie: a non-sensitive UI preference cookie
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  },
});
</script>

<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<Tooltip.Provider delayDuration={0}>
	<div
		data-slot="sidebar-wrapper"
		style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style}"
		class={cn(
			"group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</div>
</Tooltip.Provider>
