import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
)

async function debug() {
  const { data: users, error: uError } = await supabase.from('profiles').select('*').limit(1)
  console.log('Profiles count:', users?.length)
  
  const { data: leaves, error: lError } = await supabase.from('attendance_leaves').select('*')
  console.log('Leaves count:', leaves?.length)
  if (lError) console.error('Leaves error:', lError)
}

debug()
