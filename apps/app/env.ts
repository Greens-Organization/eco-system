import { packEnv as analytics } from '@pack/analytics/pack-env';
import { packEnv as auth } from '@pack/auth/pack-env';
import { packEnv as database } from '@pack/db/pack-env';
import { packEnv as email } from '@pack/email/pack-env';
import { packEnv as core } from '@pack/next-config/pack-env';
import { packEnv as observability } from '@pack/observability/pack-env';
import { packEnv as security } from '@pack/security/pack-env';
import { packEnv as webhooks } from '@pack/webhooks/pack-env';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  extends: [
    auth(),
    analytics(),
    core(),
    database(),
    email(),
    observability(),
    security(),
    webhooks(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
});
