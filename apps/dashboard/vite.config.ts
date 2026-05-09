import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const analyze = process.env['ANALYZE'] === '1';

/**
 * Emits `bundle-stats.json` (full per-module sizes) plus a console
 * summary of the top-N chunks/modules. Activated only with ANALYZE=1
 * so it never runs in regular builds.
 */
function bundleStats(top = 20): Plugin {
  return {
    name: 'bundle-stats',
    apply: 'build',
    generateBundle(_, bundle) {
      const rows = Object.values(bundle)
        .filter((c): c is Extract<typeof c, { type: 'chunk' }> => c.type === 'chunk')
        .flatMap((c) =>
          Object.entries(c.modules).map(([id, m]) => ({
            chunk: c.fileName,
            module: id.split('/node_modules/').pop() ?? id,
            bytes: m.renderedLength ?? 0,
          }))
        )
        .sort((a, b) => b.bytes - a.bytes);

      this.emitFile({
        type: 'asset',
        fileName: 'bundle-stats.json',
        source: JSON.stringify(rows, null, 2),
      });

      const fmt = (n: number) => `${(n / 1024).toFixed(1)} KB`;
      console.log(`\nbundle-stats — top ${top} modules:`);
      for (const r of rows.slice(0, top)) {
        console.log(`  ${fmt(r.bytes).padStart(10)}  ${r.module}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), analyze && bundleStats()],
  server: { port: 3000 },
  ssr: {
    // Bundle lucide into the SSR output so the 1k+ icon files don't get
    // transformed individually (default node_modules deps are externalized
    // and require()'d at runtime — no prebundle needed for them).
    noExternal: ['lucide-svelte'],
    // pino + pino-pretty rely on `__dirname` to locate their transport
    // worker file. Bundling them into an ESM output strips that and the
    // logger crashes at startup (`vite preview`, adapter-node prod).
    // Keep them external — Node loads them from node_modules at runtime
    // where the worker resolution works natively.
    external: ['pino', 'pino-pretty', 'thread-stream'],
  },
  optimizeDeps: {
    // Client-side prebundle warm-up. Only list deps the dashboard
    // *directly* imports from the browser — server-only packages
    // (better-auth, pino, ...) come in via @pack/* workspaces and are
    // never shipped to the client, so they don't belong here.
    include: ['lucide-svelte', 'mode-watcher', 'zod'],
  },
});
