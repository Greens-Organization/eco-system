<script lang="ts">
import { ModeToggle } from '@pack/design-system/components/toggle';
import Trees from 'lucide-svelte/icons/trees';
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
}
let { children }: Props = $props();
</script>

<div class="grid min-h-svh lg:grid-cols-2">
    <!-- Dark sidebar -->
    <div
        class="relative hidden flex-col justify-between bg-zinc-900 p-10 text-white dark:border-r lg:flex"
    >
        <div class="flex items-center gap-2 font-semibold">
            <Trees class="size-5" />
            <span>eco-system</span>
        </div>

        <blockquote class="space-y-2">
            <p class="text-lg">"Build fast, ship confidently."</p>
            <footer class="text-sm text-zinc-400">GRN Group</footer>
        </blockquote>

        <div class="flex items-center gap-2">
            <ModeToggle
                class="border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white cursor-pointer"
            />
        </div>
    </div>

    <!-- Form area -->
    <div class="flex flex-col items-center justify-center p-8">
        <div class="w-full max-w-sm">
            {@render children?.()}
        </div>
    </div>
</div>
