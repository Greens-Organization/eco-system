import 'server-only';
import { PostHog } from 'posthog-node';
import { chaves } from '../chaves';

export const analytics = new PostHog(chaves().NEXT_PUBLIC_POSTHOG_KEY, {
  host: chaves().NEXT_PUBLIC_POSTHOG_HOST,

  // Don't batch events and flush immediately - we're running in a serverless environment
  flushAt: 1,
  flushInterval: 0,
});
