import { env } from '@/env';
import { config, withAnalyzer } from '@pack/next-config';
import { withLogging, withSentry } from '@pack/observability/next-config';
import type { NextConfig } from 'next';

let nextConfig: NextConfig = withLogging(config);

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
