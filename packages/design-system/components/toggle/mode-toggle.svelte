<script lang="ts">
    import { toggleMode } from "mode-watcher";
    import { Moon, Sun } from "@lucide/svelte/icons";
    import { cn } from "../../lib/utils";

    interface Props {
        class?: string;
    }
    let { class: className }: Props = $props();
</script>

<button
    type="button"
    onclick={toggleMode}
    class={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
    )}
    aria-label="Toggle theme"
    data-slot="mode-toggle"
>
    <Sun
        class="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
    />
    <Moon
        class="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
    />
</button>
