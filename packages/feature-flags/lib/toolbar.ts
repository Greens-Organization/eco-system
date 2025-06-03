import { withVercelToolbar } from '@vercel/toolbar/plugins/next';
import { chaves } from '../chaves';

export const withToolbar = (config: object) =>
  chaves().FLAGS_SECRET ? withVercelToolbar()(config) : config;
