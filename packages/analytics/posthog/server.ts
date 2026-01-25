import 'server-only';
import { PostHog } from 'posthog-node';
import { packEnv } from '../pack-env';

const _env = packEnv();

export const analytics = new PostHog(_env.NEXT_PUBLIC_POSTHOG_KEY, {
  host: _env.NEXT_PUBLIC_POSTHOG_HOST,

  // Don't batch events and flush immediately - we're running in a serverless environment
  flushAt: 1,
  flushInterval: 0,
});
