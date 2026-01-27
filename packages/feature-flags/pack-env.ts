import { createEnv } from '@t3-oss/env-nextjs';

export const packEnv = () =>
  createEnv({
    server: {},
    runtimeEnv: {},
  });
