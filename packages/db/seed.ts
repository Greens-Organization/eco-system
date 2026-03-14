import { db, disconnectDatabase } from './index'
import { account, user } from './schema'
import { argon2Adapter } from '@pack/tools'

const SEED_USER = {
  name: 'Admin',
  email: 'admin@greens.lat',
  rawPassword: 'password123',
}

async function seed() {
  console.log('[seed] Starting...')

  const passwordHashed = await argon2Adapter.hash(SEED_USER.rawPassword)

  const [newUser] = await db
    .insert(user)
    .values({
      name: SEED_USER.name,
      email: SEED_USER.email,
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning()

  if (!newUser) {
    console.log('[seed] User already exists — skipping.')
    return
  }

  await db.insert(account).values({
    accountId: SEED_USER.email,
    providerId: 'credential',
    userId: newUser.id,
    password: passwordHashed,
  })

  console.log(`[seed] Done.`)
  console.log(`  email:    ${SEED_USER.email}`)
  console.log(`  password: ${SEED_USER.rawPassword}`)
}

seed()
  .catch(console.error)
  .finally(() => disconnectDatabase())
