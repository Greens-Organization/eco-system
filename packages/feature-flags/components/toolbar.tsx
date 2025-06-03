import { VercelToolbar } from '@vercel/toolbar/next';
import { chaves } from '../chaves';

export const Toolbar = () => (chaves().FLAGS_SECRET ? <VercelToolbar /> : null);
