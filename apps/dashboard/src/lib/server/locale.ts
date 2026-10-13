import { isValidLocale, type Locale } from '@pack/i18n';

/**
 * The locale for a `load` that renders anything by language. Kit reruns a
 * load on client-side navigation only when something it read changed, and
 * it cannot see `locals`: a load that took the locale from there would keep
 * the old language after a switch or a back/forward between languages.
 * Reading `params.locale` makes the language one of its dependencies.
 */
export function loadLocale(event: {
  params: Partial<Record<string, string>>;
  locals: App.Locals;
}): Locale {
  const { locale } = event.params;
  return locale && isValidLocale(locale) ? locale : event.locals.locale;
}
