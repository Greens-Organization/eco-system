import { Knock } from '@knocklabs/node';
import { packEnv } from './pack-env';

const _env = packEnv();

const key = _env.KNOCK_SECRET_API_KEY;

export const notifications = new Knock({ apiKey: key });
