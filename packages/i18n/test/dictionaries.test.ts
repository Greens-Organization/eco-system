import { describe, expect, test } from 'bun:test';
import { locales } from '../src/shared';

type Tree = { [key: string]: string | Tree };

/** Every leaf as `a.b.c`, so two dictionaries compare as key sets. */
function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [`${prefix}${key}`]
      : keys(value, `${prefix}${key}.`)
  );
}

const load = async (locale: string): Promise<Tree> =>
  (await import(`../dictionaries/${locale}.json`)).default;

describe('dictionaries', () => {
  test('every locale has exactly the keys English has', async () => {
    const english = new Set(keys(await load('en')));
    for (const locale of locales) {
      const own = new Set(keys(await load(locale)));
      expect({
        locale,
        missing: [...english].filter((k) => !own.has(k)),
      }).toEqual({ locale, missing: [] });
      expect({
        locale,
        extra: [...own].filter((k) => !english.has(k)),
      }).toEqual({ locale, extra: [] });
    }
  });

  test('no translation is empty', async () => {
    for (const locale of locales) {
      const dictionary = await load(locale);
      const empty = keys(dictionary).filter((path) => {
        const value = path
          .split('.')
          .reduce<string | Tree>(
            (node, key) => (node as Tree)[key] as string | Tree,
            dictionary
          );
        return typeof value === 'string' && !value.trim();
      });
      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });
});
