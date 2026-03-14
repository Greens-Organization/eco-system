import type { Dictionary, Locale } from '@pack/i18n'

declare global {
  namespace App {
    interface Locals {
      locale: Locale
      session: string | null
      dictionary: Dictionary
    }
    interface PageData {
      locale: Locale
      dictionary: Dictionary
      user?: { id: string; name: string; email: string; image?: string | null } | null
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {}
