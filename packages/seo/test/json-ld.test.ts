import { describe, expect, test } from 'bun:test';
import { jsonLdScript } from '../src/json-ld';

const product = (name: string) =>
  ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
  }) as const;

/** What the HTML parser sees: the block ends at the first `</script`. */
const scriptBody = (json: string) => {
  const html = `<script type="application/ld+json">${json}</script>`;
  const start = html.indexOf('>') + 1;
  return html.slice(start, html.toLowerCase().indexOf('</script', start));
};

describe('jsonLdScript', () => {
  test('a value cannot close the script element', () => {
    const json = jsonLdScript(
      product('</script><script>alert(document.cookie)</script>')
    );
    expect(json.toLowerCase()).not.toContain('</script');
    expect(scriptBody(json)).toBe(json);
  });

  test('HTML comment openers are neutralised too', () => {
    expect(jsonLdScript(product('<!-- x -->'))).not.toContain('<!--');
  });

  test('the JSON still parses back to the same data', () => {
    const name = '</script> & <b>bold</b> \u2028line\u2029para';
    const json = jsonLdScript(product(name));
    expect(JSON.parse(json)).toEqual(product(name));
    expect(json).not.toMatch(/[<>&\u2028\u2029]/);
  });

  test('plain values are untouched', () => {
    expect(jsonLdScript(product('Café 100%'))).toBe(
      '{"@context":"https://schema.org","@type":"Product","name":"Café 100%"}'
    );
  });
});
