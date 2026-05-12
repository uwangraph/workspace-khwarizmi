import { createClient } from '@supabase/supabase-js'
import { error, type RequestEvent } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import { supabaseAdmin } from '$lib/server/supabase'

// Singleton — stateless anon client aman di-reuse antar request untuk verifikasi token
const anonClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

async function getBearerUser(event: RequestEvent) {
  const authHeader = event.request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) {
    throw error(401, 'Sesi tidak valid')
  }

  const {
    data: { user },
    error: authError
  } = await anonClient.auth.getUser(token)

  if (authError || !user) {
    throw error(401, 'Sesi tidak valid')
  }

  return user
}

export async function requireAuthenticated(event: RequestEvent) {
  return await getBearerUser(event)
}

export async function requireAdmin(event: RequestEvent) {
  if (!supabaseAdmin) {
    throw error(500, 'Admin service tidak tersedia. Periksa konfigurasi server.');
  }

  const user = await getBearerUser(event)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    throw error(403, 'Akses admin diperlukan')
  }

  return { user, profile }
}

export async function requireSelfOrAdmin(event: RequestEvent, targetUserId: string) {
  if (!supabaseAdmin) {
    throw error(500, 'Admin service tidak tersedia. Periksa konfigurasi server.');
  }

  const user = await getBearerUser(event)
  if (user.id === targetUserId) return { user, isAdmin: false }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    throw error(403, 'Tidak diizinkan')
  }

  return { user, isAdmin: true }
}
