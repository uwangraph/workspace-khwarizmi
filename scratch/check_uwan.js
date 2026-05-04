import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkProfiles() {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').ilike('full_name', '%Uwan%')
  if (error) {
    console.error('Error selecting from profiles:', error.message)
    return
  }

  console.log('Profiles matching "Uwan":', data)
}

checkProfiles()
