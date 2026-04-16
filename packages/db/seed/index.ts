import { disconnectDatabase } from '../index'
import { seedAdmin } from './admin.seed'

async function seed() {
  console.log('[seed] Starting...')

  await seedAdmin()

  console.log('[seed] All done.')
}

seed()
  .catch(console.error)
  .finally(() => disconnectDatabase())
