import { withVercelToolbar } from '@vercel/toolbar/plugins/next';
import { packEnv } from '../pack-env';

const _env = packEnv();

export const withToolbar = (config: object) =>
  _env.FLAGS_SECRET ? withVercelToolbar()(config) : config;
