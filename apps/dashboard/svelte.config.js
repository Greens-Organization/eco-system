import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // OpenTelemetry spans for handle, load and form actions, and
    // src/instrumentation.server.ts loaded before the app (experimental
    // since Kit 2.31). Off at runtime without OTEL_EXPORTER_OTLP_ENDPOINT.
    experimental: {
      tracing: { server: true },
      instrumentation: { server: true },
    },
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
    alias: {
      '@api/*': '../dashboard-api/src/*',
      // Transitive API path aliases (needed to typecheck AppType imports)
      '@/core/*': '../dashboard-api/src/core/*',
      '@/infra/*': '../dashboard-api/src/infra/*',
      '@/main/*': '../dashboard-api/src/main/*',
    },
  },
};

export default config;
