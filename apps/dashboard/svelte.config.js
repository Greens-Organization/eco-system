import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
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
