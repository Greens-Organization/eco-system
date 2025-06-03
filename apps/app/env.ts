import { chaves as analytics } from '@pack/analytics/chaves';
import { chaves as auth } from '@pack/auth/chaves';
import { chaves as collaboration } from '@pack/collaboration/chaves';
import { chaves as database } from '@pack/db/chaves';
import { chaves as email } from '@pack/email/chaves';
import { chaves as flags } from '@pack/feature-flags/chaves';
import { chaves as core } from '@pack/next-config/chaves';
import { chaves as notifications } from '@pack/notifications/chaves';
import { chaves as observability } from '@pack/observability/chaves';
import { chaves as security } from '@pack/security/chaves';
import { chaves as webhooks } from '@pack/webhooks/chaves';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  extends: [
    auth(),
    analytics(),
    collaboration(),
    core(),
    database(),
    email(),
    flags(),
    notifications(),
    observability(),
    security(),
    webhooks(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
});
