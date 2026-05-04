
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkMyProfile() {
  const myId = '77594f8b-5e23-45db-8a34-2312d25b5a26'
  console.log('Checking profile for ID:', myId)
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', myId)
    .single()

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('YOUR CURRENT PROFILE DATA:', data)
}

checkMyProfile()
