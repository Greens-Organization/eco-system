import { match as matchLocale } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { locales } from './shared'

export type Locale = (typeof locales)[number]

export { locales }

export const defaultLocale: Locale = 'en'

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

/**
 * Resolves the best locale from an Accept-Language header value.
 * Intended for use in SvelteKit hooks.server.ts.
 */
export function resolveLocale(acceptLanguageHeader: string | null): Locale {
  if (!acceptLanguageHeader) return defaultLocale

  const headers = { 'accept-language': acceptLanguageHeader }
  const negotiator = new Negotiator({ headers })
  const acceptedLanguages = negotiator.languages()

  try {
    return matchLocale(acceptedLanguages, locales as unknown as string[], defaultLocale) as Locale
  } catch {
    return defaultLocale
  }
}

/**
 * Extracts locale segment from a pathname (e.g. '/en/dashboard' → 'en').
 * Returns defaultLocale if not found or invalid.
 */
export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split('/')[1] ?? ''
  return isValidLocale(segment) ? segment : defaultLocale
}

/**
 * Removes locale prefix from a pathname (e.g. '/en/dashboard' → '/dashboard').
 */
export function removeLocaleFromPathname(pathname: string): string {
  const segment = pathname.split('/')[1] ?? ''
  if (isValidLocale(segment)) {
    return pathname.slice(segment.length + 1) || '/'
  }
  return pathname
}

/**
 * Adds locale prefix to a pathname (e.g. '/dashboard', 'pt' → '/pt/dashboard').
 */
export function addLocaleToPathname(pathname: string, locale: Locale): string {
  const clean = removeLocaleFromPathname(pathname)
  return `/${locale}${clean === '/' ? '' : clean}`
}
