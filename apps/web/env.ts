import { chaves as cms } from '@pack/cms/chaves';
import { chaves as email } from '@pack/email/chaves';
import { chaves as flags } from '@pack/feature-flags/chaves';
import { chaves as core } from '@pack/next-config/chaves';
import { chaves as observability } from '@pack/observability/chaves';
import { chaves as rateLimit } from '@pack/rate-limit/chaves';
import { chaves as security } from '@pack/security/chaves';
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
