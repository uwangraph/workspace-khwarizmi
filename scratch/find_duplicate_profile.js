
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function findDuplicateProfile() {
  console.log('Searching for "Umar" in profiles table...')
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('full_name', '%Umar%')

  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('FOUND MATCHING PROFILES:', data)
  } else {
    console.log('No profile with name "Umar" found.')
  }
}

findDuplicateProfile()
