import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // biome-ignore lint/suspicious/useAwait: "redirects is async"
  redirects: async () => {
    return [
      {
        source: '/docs/migrations',
        destination: '/docs/migrations/authentication/authjs',
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
