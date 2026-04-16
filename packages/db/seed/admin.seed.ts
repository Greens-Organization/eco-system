import { argon2Adapter } from '@pack/tools'
import { db } from '../index'
import { env } from '../pack-env'
import { account, user } from '../schema'

const email = env.ADMIN_EMAIL ?? 'admin@example.com'
const password = env.ADMIN_PASSWORD ?? 'admin'
const name = env.ADMIN_NAME ?? 'admin'

export async function seedAdmin() {
  const passwordHashed = await argon2Adapter.hash(password)

  const [newUser] = await db
    .insert(user)
    .values({ name, email, emailVerified: true })
    .onConflictDoNothing()
    .returning()

  if (!newUser) {
    console.log('[seed:admin] User already exists — skipping.')
    return
  }

  await db.insert(account).values({
    accountId: email,
    providerId: 'credential',
    userId: newUser.id,
    password: passwordHashed,
  })

  console.log('[seed:admin] Done.')
  console.log(`  name:     ${name}`)
  console.log(`  email:    ${email}`)
  console.log(`  password: ${password}`)
}
