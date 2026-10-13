<script lang="ts">
interface Props {
  series: { date: string; count: number }[];
  locale: string;
  /** Spoken summary, e.g. "133 sign-ups in the last 7 days". */
  summary: string;
}

let { series, locale, summary }: Props = $props();

const max = $derived(Math.max(1, ...series.map((point) => point.count)));
const day = (date: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
</script>

<!-- Plain SVG bars: no chart library for one small series. The summary is
     the accessible name; each bar also carries its exact value. -->
<figure class="flex flex-col gap-2">
    <svg
        viewBox="0 0 {series.length * 40} 120"
        class="h-40 w-full"
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
    >
        {#each series as point, i (point.date)}
            {@const height = (point.count / max) * 100}
            <rect
                x={i * 40 + 8}
                y={100 - height}
                width="24"
                {height}
                rx="3"
                class="fill-primary"
            >
                <title>{day(point.date)}: {point.count}</title>
            </rect>
        {/each}
    </svg>
    <figcaption class="grid text-center text-xs text-muted-foreground" style="grid-template-columns: repeat({series.length}, minmax(0, 1fr))">
        {#each series as point (point.date)}
            <span>{day(point.date)}</span>
        {/each}
    </figcaption>
</figure>
