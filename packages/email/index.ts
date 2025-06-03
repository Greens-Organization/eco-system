import { Resend } from 'resend';
import { chaves } from './chaves';

export const resend = new Resend(chaves().RESEND_TOKEN);
