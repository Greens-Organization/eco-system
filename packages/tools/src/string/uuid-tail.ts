/**
 * Extracts the last segment(s) from a UUID string.
 *
 * @param uuid - The UUID string (expects 8-4-4-4-12 format)
 * @param segments - Number of segments from the end (default: 1)
 *
 * @example
 * uuidTail('550e8400-e29b-41d4-a716-446655440000') // => '446655440000'
 * uuidTail('550e8400-e29b-41d4-a716-446655440000', 2) // => 'a716-446655440000'
 */
export function uuidTail(uuid: string, segments = 1): string {
  if (!uuid) return '';
  const parts = uuid.split('-');
  if (parts.length !== 5) return uuid;
  return parts.slice(-segments).join('-');
}
