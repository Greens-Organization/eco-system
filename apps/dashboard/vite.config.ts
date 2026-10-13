import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
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
        .filter(
          (c): c is Extract<typeof c, { type: 'chunk' }> => c.type === 'chunk'
        )
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

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter(),
      // The public origin form actions are checked against (CSRF). Fixed at
      // build time from ORIGIN; unset, adapter-node derives it from the
      // request (Host, or HOST_HEADER / PROTOCOL_HEADER) and assumes https —
      // right behind a TLS proxy, so set ORIGIN for a plain-http deploy.
      paths: { origin: process.env.ORIGIN || undefined },
      // Kit adds a per-request nonce to its own scripts; ModeWatcher's inline
      // theme script gets it through `injectCspNonce` (hooks.server.ts).
      csp: {
        mode: 'nonce',
        directives: {
          'default-src': ['self'],
          'script-src': ['self'],
          // Svelte and bits-ui set inline style attributes.
          'style-src': ['self', 'unsafe-inline'],
          // genericAvatar() draws placeholder avatars from DiceBear.
          'img-src': ['self', 'data:', 'https://api.dicebear.com'],
          'font-src': ['self'],
          'connect-src': ['self'],
          'object-src': ['none'],
          'base-uri': ['self'],
          'form-action': ['self'],
          // The admin panel is never framed (clickjacking).
          'frame-ancestors': ['none'],
        },
      },
      // OpenTelemetry spans for handle, load and form actions. Kit loads
      // src/instrumentation.server.ts before the app on its own. Off at
      // runtime without OTEL_EXPORTER_OTLP_ENDPOINT.
      tracing: { server: true },
    }),
    analyze && bundleStats(),
  ],
  server: {
    port: 3000,
    // Pre-transform the heavy layout + sidebar tree during server boot so the
    // first request doesn't pay it. Dev-only; does not affect the prod build.
    warmup: {
      ssrFiles: [
        './src/routes/+layout.svelte',
        './src/routes/[locale]/+layout.svelte',
        './src/routes/[locale]/(authenticated)/+layout.svelte',
        './src/routes/[locale]/(unauthenticated)/+layout.svelte',
        './src/lib/components/sidebar/app-sidebar.svelte',
      ],
      clientFiles: [
        './src/routes/+layout.svelte',
        './src/routes/[locale]/(authenticated)/+layout.svelte',
      ],
    },
  },
  ssr: {
    // Only fold lucide into the SSR output for the production build, where a
    // single chunk is wanted. In dev, externalizing (Vite's default) keeps the
    // SSR cold-start fast — `noExternal` would push lucide's modules through
    // Vite's transform on every restart.
    noExternal: command === 'build' ? ['@lucide/svelte'] : [],
    // pino + pino-pretty resolve their transport worker via `__dirname`, which
    // bundling into ESM strips. Keep them external in both dev and build.
    external: ['pino', 'pino-pretty', 'thread-stream'],
  },
  optimizeDeps: {
    // Pre-bundle the client deps the dashboard pulls *transitively* through the
    // @pack/design-system workspace package. Vite treats that package as source
    // and won't pre-scan into it, so without this it discovers these on the
    // first request, re-bundles, and forces a full-page reload. Under Bun's
    // isolated linker these deps don't resolve from the dashboard root, so they
    // use the nested `@pack/design-system > dep` form (resolve in the parent's
    // context). The dashboard's own deps stay bare. The `*/icons/*` globs
    // pre-bundle the per-icon deep imports up front; measured cold first-render
    // dropped from ~37s to ~19s on this (slow) box with the globs + warmup.
    include: [
      '@lucide/svelte/icons/*',
      'mode-watcher',
      'zod',
      '@pack/design-system > bits-ui',
      '@pack/design-system > tailwind-variants',
      '@pack/design-system > tailwind-merge',
      '@pack/design-system > clsx',
    ],
  },
}));
