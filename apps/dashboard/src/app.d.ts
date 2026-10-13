import type { Dictionary, Locale } from '@pack/i18n';
import type { Logger } from '@pack/observability/logger';

interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  [key: string]: unknown;
}

interface SessionData {
  id: string;
  userId: string;
  expiresAt: Date;
  [key: string]: unknown;
}

declare global {
  namespace App {
    interface Locals {
      locale: Locale;
      session: SessionData | null;
      user: SessionUser | null;
      dictionary: Dictionary;
      requestId: string;
      log: Logger;
    }
    interface PageData {
      locale: Locale;
      dictionary: Dictionary;
      user?: SessionUser | null;
    }
    interface Error {
      errorId?: string;
    }
    // interface Platform {}
  }
}
