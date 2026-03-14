import { redirect } from '@sveltejs/kit'
import { defaultLocale } from '@pack/i18n'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  redirect(307, `/${locals.locale ?? defaultLocale}`)
}
