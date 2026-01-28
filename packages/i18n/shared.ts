import type en from './dictionaries/en.json';
import languine from './languine.json';

export const locales = [
  languine.locale.source,
  ...languine.locale.targets,
] as const;

export type Dictionary = typeof en;
