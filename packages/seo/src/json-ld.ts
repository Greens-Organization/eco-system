import type { Thing, WithContext } from 'schema-dts';

export type { Thing, WithContext };

// Inside a <script> element the HTML parser ends the block at the first
// `</script`, whatever the JSON says, and `<!--` changes how it is read: any
// value carrying them (a product name, a user's bio) could inject markup.
// Escaping `<`, `>` and `&` as JSON unicode escapes keeps the JSON identical
// to a parser and inert to HTML. U+2028/U+2029 are escaped too: valid in
// JSON, they used to end a line in JavaScript strings.
const UNSAFE = /[<>&\u2028\u2029]/g;
const ESCAPED: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serializes a JSON-LD schema object for a `<script type="application/ld+json">`
 * block. Safe to drop in with {@html} or any framework's equivalent: values
 * cannot close the script element.
 *
 * @example (SvelteKit)
 * <svelte:head>
 *   {@html `<script type="application/ld+json">${jsonLdScript(schema)}</script>`}
 * </svelte:head>
 */
export const jsonLdScript = (code: WithContext<Thing>): string =>
  JSON.stringify(code).replace(UNSAFE, (char) => ESCAPED[char] ?? char);

export * from 'schema-dts';
