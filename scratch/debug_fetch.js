import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
)

async function debug() {
  console.log('Fetching attendance_leaves...')
  const { data, error } = await supabase.from('attendance_leaves').select('*')
  if (error) console.error('Error fetching leaves:', error)
  else console.log('Leaves count:', data?.length)
  
  console.log('Fetching app_settings...')
  const { data: settings, error: sError } = await supabase.from('app_settings').select('*')
  if (sError) console.error('Error fetching settings:', sError)
  else console.log('Settings:', settings)
}

debug()
