import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function inspectProfiles() {
  const { data, error } = await supabaseAdmin.rpc('get_table_info', { table_name: 'profiles' })
  // If RPC doesn't exist, try a simple select to see columns
  if (error) {
    console.log('RPC get_table_info not found, trying select * limit 1')
    const { data: selectData, error: selectError } = await supabaseAdmin.from('profiles').select('*').limit(1)
    if (selectError) {
      console.error('Error selecting from profiles:', selectError.message)
    } else {
      console.log('Columns in profiles:', Object.keys(selectData[0] || {}))
    }
  } else {
    console.log('Table info:', data)
  }
}

inspectProfiles()
