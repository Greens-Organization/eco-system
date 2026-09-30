import nodemailer from 'nodemailer';
import { env } from '../pack-env';

export interface SendEmailHtmlOptions {
  html: string;
  subject: string;
  to: string | string[];
  from?: string;
  fromDisplayName?: string;
  cc?: string | string[];
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
  }>;
}

// Create transporter singleton
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const shouldSendEmail =
  process.env.NODE_ENV === 'production' ||
  process.env.NODE_ENV === 'development';

/**
 * Send email with HTML string.
 *
 * Templating is deliberately left to the caller: render your HTML however you
 * like and hand it over as a string.
 */
export const sendEmailHtml = async (
  options: SendEmailHtmlOptions
): Promise<void> => {
  if (!shouldSendEmail) {
    console.log('[DEV] Email HTML que seria enviado:', {
      to: options.to,
      subject: options.subject,
      from: options.from || env.SMTP_FROM,
    });
    return;
  }

  const from = options.fromDisplayName
    ? {
        name: options.fromDisplayName,
        address: options.from || env.SMTP_FROM,
      }
    : options.from || env.SMTP_FROM;

  const to = Array.isArray(options.to) ? options.to.join(',') : options.to;
  const cc = options.cc
    ? Array.isArray(options.cc)
      ? options.cc.join(',')
      : options.cc
    : undefined;

  try {
    await transporter.sendMail({
      from,
      to,
      cc,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
  } catch (error) {
    console.error('[EmailSender] Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Send batch emails with HTML
 */
export const sendBatchEmailHtml = async (
  emails: SendEmailHtmlOptions[]
): Promise<void> => {
  if (!shouldSendEmail) {
    console.log(`[DEV] ${emails.length} emails que seriam enviados em batch`);
    return;
  }

  // Send all emails in parallel
  await Promise.all(emails.map((email) => sendEmailHtml(email)));
};
