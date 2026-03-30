import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '@pack/*': '../../packages/*',
      '@api/*': '../api/src/*',
      // Transitive API path aliases (needed to typecheck AppType imports)
      '@/core/*': '../api/src/core/*',
      '@/infra/*': '../api/src/infra/*',
      '@/main/*': '../api/src/main/*',
    },
  },
};

export default config;
