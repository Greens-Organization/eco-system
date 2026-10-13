import { loadLocale } from '#lib/server/locale.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  return {
    locale: loadLocale(event),
    dictionary: event.locals.dictionary,
  };
};
