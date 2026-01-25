import { packEnv as cms } from '@pack/cms/pack-env';
import { packEnv as email } from '@pack/email/pack-env';
import { packEnv as flags } from '@pack/feature-flags/pack-env';
import { packEnv as core } from '@pack/next-config/pack-env';
import { packEnv as observability } from '@pack/observability/pack-env';
import { packEnv as rateLimit } from '@pack/rate-limit/pack-env';
import { packEnv as security } from '@pack/security/pack-env';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  extends: [
    cms(),
    core(),
    email(),
    observability(),
    flags(),
    security(),
    rateLimit(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
});
