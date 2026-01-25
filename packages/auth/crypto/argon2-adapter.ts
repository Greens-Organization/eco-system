import { password } from 'bun';

const { hash, verify } = password;

export class Argon2Adapter {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, {
      algorithm: 'argon2id',
      memoryCost: 8129,
      timeCost: 2,
    });
  }

  async compare(payload: { hash: string; password: string }): Promise<boolean> {
    return verify(payload.password, payload.hash);
  }
}

export const argon2Adapter = new Argon2Adapter();
