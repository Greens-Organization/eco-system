import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { env } from '$lib/env'

export const load: LayoutServerLoad = async ({ locals, request }) => {
  if (!locals.session) {
    redirect(307, `/${locals.locale}/sign-in`)
  }

  // Fetch user data server-side using the session cookie
  const cookie = request.headers.get('cookie') ?? ''
  let user: {
    id: string
    name: string
    email: string
    image?: string | null
  } | null = null

  try {
    const res = await fetch(`${env.API_URL}/auth/get-session`, {
      headers: { Cookie: cookie },
    })
    if (res.ok) {
      const data = (await res.json()) as {
        user?: { id: string; name: string; email: string; image?: string | null }
      }
      user = data?.user ?? null
    }
  } catch {
    // silently fail — avatar will show generic fallback
  }

  return { user }
}
