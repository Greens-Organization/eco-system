/**
 * Wait for every task, but no longer than `ms`; failures are swallowed.
 * Telemetry flushes are best effort: with the collector down, an OTLP
 * exporter retries until its own timeout and would hold the process (and
 * the graceful shutdown) hostage.
 */
export async function settleWithin(
  tasks: Array<Promise<unknown> | undefined>,
  ms: number
): Promise<void> {
  const settled = Promise.allSettled(tasks.filter(Boolean));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  await Promise.race([settled, deadline]);
  clearTimeout(timer);
}
