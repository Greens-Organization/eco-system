import { Resend } from 'resend';
import { packEnv } from './pack-env';

const _env = packEnv();

export const resend = new Resend(_env.RESEND_TOKEN);
