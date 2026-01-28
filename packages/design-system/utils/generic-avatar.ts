/**
 * Builds a DiceBear avatar SVG URL using a seed.
 */
export function genericAvatar(name = 'GG') {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${name}`;
}
