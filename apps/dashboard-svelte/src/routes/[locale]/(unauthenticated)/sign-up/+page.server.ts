import { fail, redirect } from '@sveltejs/kit'
import { defaultLocale } from '@pack/i18n'
import { env } from '$lib/env'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    redirect(307, `/${locals.locale ?? defaultLocale}`)
  }
}

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const data = await request.formData()
    const name = data.get('name') as string
    const email = data.get('email') as string
    const password = data.get('password') as string

    if (!name || !email || !password) {
      return fail(400, { error: 'All fields are required' })
    }

    let res: Response
    try {
      res = await fetch(`${env.API_URL}/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') ?? '',
          'Origin': url.origin,
        },
        body: JSON.stringify({ name, email, password }),
      })
    } catch {
      return fail(503, { error: 'Could not reach the server. Please try again later.' })
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, string>
      return fail(res.status, { error: body['message'] ?? body['error'] ?? 'Sign up failed' })
    }

    const locale = locals.locale ?? defaultLocale
    redirect(303, `/${locale}/sign-in`)
  },
}
