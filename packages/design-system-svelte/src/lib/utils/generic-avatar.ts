/**
 * Generates a DiceBear avatar URL for a given seed (e.g. user name or email).
 */
export function genericAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`
}
