import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkPublicUsers() {
  console.log('--- Checking public.users ---')
  const { data, error } = await supabaseAdmin.from('users').select('*').limit(100)
  if (error) {
    console.error('Error selecting from public.users:', error.message)
    return
  }
  
  data.forEach(u => {
    console.log(`ID: ${u.id}, Email: ${u.email || u.email_address || 'no email'}`)
  })
}

checkPublicUsers()
