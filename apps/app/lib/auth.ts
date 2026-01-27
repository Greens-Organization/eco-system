import { env } from '@/env'
import {generateAuthClient} from '@pack/auth/client'

export const authClient = generateAuthClient(env.API_URL)
