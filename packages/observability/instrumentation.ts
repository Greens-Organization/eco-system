import { init } from '@sentry/nextjs';
import { packEnv } from './pack-env';

const _env = packEnv();

const opts = {
  dsn: _env.NEXT_PUBLIC_SENTRY_DSN,
};

export const initializeSentry = () => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    init(opts);
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    init(opts);
  }
};
