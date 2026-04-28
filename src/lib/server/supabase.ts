import { createClient } from '@supabase/supabase-js'
import { env } from '$env/dynamic/private'
import { env as publicEnv } from '$env/dynamic/public'

const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

// Buat client hanya jika key tersedia untuk mencegah crash saat build
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as any
