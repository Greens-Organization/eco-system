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

// Create transporter singleton. No auth block when no user: a local SMTP
// sink (Mailpit in the e2e compose) takes mail without one.
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  ...(env.SMTP_USER
    ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
    : {}),
});

/**
 * Mail goes out when SMTP is configured, in any environment. Without it,
 * development just logs what would be sent; production refuses, so a missing
 * SMTP_HOST is an error someone sees, not mail silently dropped.
 */
function smtpConfigured(what: string): boolean {
  if (env.SMTP_HOST) return true;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`SMTP_HOST is not set: cannot send ${what}`);
  }
  return false;
}

/**
 * Send email with HTML string.
 *
 * Templating is deliberately left to the caller: render your HTML however you
 * like and hand it over as a string.
 */
export const sendEmailHtml = async (
  options: SendEmailHtmlOptions
): Promise<void> => {
  if (!smtpConfigured('email')) {
    console.log('[email] SMTP not configured; would send:', {
      to: options.to,
      subject: options.subject,
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
  if (!smtpConfigured('a batch')) {
    console.log(
      `[email] SMTP not configured; would send ${emails.length} emails`
    );
    return;
  }

  // Send all emails in parallel
  await Promise.all(emails.map((email) => sendEmailHtml(email)));
};
