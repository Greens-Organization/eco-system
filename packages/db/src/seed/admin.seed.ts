import { argon2Adapter } from '@pack/tools';
import { eq } from 'drizzle-orm';
import { env } from '../../pack-env';
import { account, user } from '../../schema';
import { db } from '../index';

/** better-auth's `emailAndPassword` limits; the seed writes past them. */
export const ADMIN_PASSWORD_LENGTH = { min: 8, max: 128 } as const;

export type AdminSeed = {
  email: string | undefined;
  password: string | undefined;
  name?: string;
};

/**
 * Create the admin from ADMIN_EMAIL / ADMIN_PASSWORD, or leave an existing
 * one alone. There is no default credential: a seed that falls back to a
 * known password ships a known password. The rows are written straight to
 * better-auth's tables, so they must match what its sign-up writes.
 */
export async function seedAdmin(
  input: AdminSeed = {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    name: env.ADMIN_NAME,
  }
): Promise<'created' | 'exists'> {
  if (!input.email)
    throw new Error('ADMIN_EMAIL is required to seed the admin');
  // better-auth stores and looks up emails lowercased.
  const email = input.email.toLowerCase();

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  if (existing) {
    console.log(`[seed:admin] ${email} already exists — skipping.`);
    return 'exists';
  }

  const { password } = input;
  const { min, max } = ADMIN_PASSWORD_LENGTH;
  if (!password || password.length < min || password.length > max) {
    throw new Error(`ADMIN_PASSWORD must have ${min} to ${max} characters`);
  }
  const hash = await argon2Adapter.hash(password);

  // Both rows or neither: a user without its credential cannot sign in, and
  // a re-run would skip it as "already exists".
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(user)
      .values({ name: input.name ?? 'Admin', email, emailVerified: true })
      .returning({ id: user.id });
    if (!created) throw new Error('inserting the admin user returned no row');
    await tx.insert(account).values({
      // better-auth finds the credential by `accountId === user.id`.
      accountId: created.id,
      providerId: 'credential',
      userId: created.id,
      password: hash,
    });
  });

  console.log(`[seed:admin] Created ${email} (password from ADMIN_PASSWORD).`);
  return 'created';
}
