import { chaves as analytics } from '@pack/analytics/chaves';
import { chaves as auth } from '@pack/auth/chaves';
import { chaves as database } from '@pack/db/chaves';
import { chaves as email } from '@pack/email/chaves';
import { chaves as core } from '@pack/next-config/chaves';
import { chaves as observability } from '@pack/observability/chaves';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  extends: [auth(), analytics(), core(), database(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
});
