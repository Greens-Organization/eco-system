import { VercelToolbar } from '@vercel/toolbar/next';
import { packEnv } from '../pack-env';

const _env = packEnv();

export const Toolbar = () => (_env.FLAGS_SECRET ? <VercelToolbar /> : null);
