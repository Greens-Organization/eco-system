const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Why `db:reset` must not run against `databaseUrl`, or null when it may.
 * Wiping every table is only allowed on a database on this machine and
 * never under NODE_ENV=production. NODE_ENV alone is not a guard: the
 * package's own `.env` sets it, so a production DATABASE_URL in the shell
 * would sail through.
 */
export function resetRefusal(
  databaseUrl: string,
  nodeEnv: string | undefined
): string | null {
  if (nodeEnv === 'production') return 'NODE_ENV is production';

  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return 'DATABASE_URL is not a valid URL';
  }
  if (!LOCAL_HOSTS.has(host)) {
    return `database host "${host}" is not this machine (localhost only)`;
  }
  return null;
}
