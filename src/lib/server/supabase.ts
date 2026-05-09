import { createClient } from '@supabase/supabase-js'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'

// Buat client hanya jika key tersedia untuk mencegah crash saat build
export const supabaseAdmin = (PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) 
  ? createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null as any;

if (!supabaseAdmin) {
  console.error('[SupabaseAdmin] Gagal inisialisasi: Kunci API tidak ditemukan.');
}
