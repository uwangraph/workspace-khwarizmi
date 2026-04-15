export const ssr = false

import { supabase } from '$lib/supabase'
import { redirect } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ url }) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthPage = url.pathname.startsWith('/auth')

  if (!session && !isAuthPage) redirect(303, '/auth')
  if (session && isAuthPage) redirect(303, '/')

  return { session }
}