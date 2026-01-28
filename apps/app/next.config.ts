import { env } from '@/env';
import { config, withAnalyzer } from '@pack/next-config';
import { withSentry } from '@pack/observability/next-config';
import type { NextConfig } from 'next';

let nextConfig: NextConfig = { ...config };

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
