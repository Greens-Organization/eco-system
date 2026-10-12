import { auth } from '@pack/auth/server';

/** RFC 4648 base32 → text: the URI carries the secret base32-encoded. */
function fromBase32(input: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of input.replace(/=+$/, '').toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  }
  const bytes = bits.match(/.{8}/g)?.map((b) => Number.parseInt(b, 2)) ?? [];
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

/** The code the user's authenticator app would show right now. */
export async function totpFor(totpURI: string): Promise<string> {
  const encoded = new URL(totpURI).searchParams.get('secret') ?? '';
  const { code } = await auth.api.generateTOTP({
    body: { secret: fromBase32(encoded) },
  });
  return code;
}
