import { db } from '@pack/db';
import { user } from '@pack/db/schema';

const uid = () => crypto.randomUUID().slice(0, 8);

/**
 * Insert a raw `user` row (better-auth table) and return it. For tests that
 * need a user record but NOT credentials. For an authenticated session, use
 * `helpers/auth.ts#authenticate` (creates user + account via sign-up).
 */
export async function makeUser(
  overrides: Partial<typeof user.$inferInsert> = {}
) {
  const tag = uid();
  const [row] = await db
    .insert(user)
    .values({
      name: `Test User ${tag}`,
      email: `user-${tag}@e2e.test`,
      emailVerified: true,
      ...overrides,
    })
    .returning();
  return row;
}
