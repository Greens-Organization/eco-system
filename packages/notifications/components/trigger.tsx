'use client';

import {
  NotificationFeedPopover,
  NotificationIconButton,
} from '@knocklabs/react';
import type { RefObject } from 'react';
import { useRef, useState } from 'react';
import { packEnv } from '../pack-env';

const _env = packEnv();

// Required CSS import, unless you're overriding the styling
import '@knocklabs/react/dist/index.css';
import '../styles.css';

export const NotificationsTrigger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const notifButtonRef = useRef<HTMLButtonElement>(null);

  const handleClose = (event: Event) => {
    if (event.target === notifButtonRef.current) {
      return;
    }

    setIsVisible(false);
  };

  if (!_env.NEXT_PUBLIC_KNOCK_API_KEY) {
    return null;
  }

  return (
    <>
      <NotificationIconButton
        onClick={() => setIsVisible(!isVisible)}
        ref={notifButtonRef}
      />
      {notifButtonRef.current && (
        <NotificationFeedPopover
          buttonRef={notifButtonRef as RefObject<HTMLElement>}
          isVisible={isVisible}
          onClose={handleClose}
        />
      )}
    </>
  );
};
