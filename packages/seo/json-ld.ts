import type { Thing, WithContext } from 'schema-dts'

export type { Thing, WithContext }

/**
 * Serializes a JSON-LD schema object to a string.
 * Use inside <svelte:head> with {@html} or any framework's equivalent.
 *
 * @example (SvelteKit)
 * <svelte:head>
 *   {@html `<script type="application/ld+json">${jsonLdScript(schema)}</script>`}
 * </svelte:head>
 */
export const jsonLdScript = (code: WithContext<Thing>): string =>
  JSON.stringify(code)

export * from 'schema-dts'
