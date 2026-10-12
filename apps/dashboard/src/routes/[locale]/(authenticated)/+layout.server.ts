import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// `sessionHandle` already resolved the session (cookie cache, or the API when
// the cache is stale), so the user comes from locals with no extra hop.
export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) {
    redirect(307, `/${locals.locale}/sign-in`);
  }

  const { id, name, email, image } = locals.user;
  return { user: { id, name: name ?? '', email, image: image ?? null } };
};
