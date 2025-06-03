import { Knock } from '@knocklabs/node';
import { chaves } from './chaves';

const key = chaves().KNOCK_SECRET_API_KEY;

export const notifications = new Knock({ apiKey: key });
