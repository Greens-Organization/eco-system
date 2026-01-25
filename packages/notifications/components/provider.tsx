'use client';

import { KnockFeedProvider, KnockProvider } from '@knocklabs/react';
import type { ReactNode } from 'react';
import { packEnv } from '../pack-env';

const _env = packEnv();

const knockApiKey = _env.NEXT_PUBLIC_KNOCK_API_KEY;
const knockFeedChannelId = _env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID;

type NotificationsProviderProps = {
  children: ReactNode;
  userId: string;
};

export const NotificationsProvider = ({
  children,
  userId,
}: NotificationsProviderProps) => {
  if (!knockApiKey || !knockFeedChannelId) {
    return children;
  }

  return (
    <KnockProvider apiKey={knockApiKey} userId={userId}>
      <KnockFeedProvider feedId={knockFeedChannelId}>
        {children}
      </KnockFeedProvider>
    </KnockProvider>
  );
};
