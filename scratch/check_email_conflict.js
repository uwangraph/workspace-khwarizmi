import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkUser() {
  const email = 'umaralkhwarizmi@gmail.com'
  console.log('Checking email:', email)
  
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    console.error('Error listing users:', error.message)
    return
  }

  const existing = data.users.find(u => u.email === email)
  if (existing) {
    console.log('USER ALREADY EXISTS:', {
      id: existing.id,
      email: existing.email,
      created_at: existing.created_at
    })
  } else {
    console.log('User does not exist with this email.')
  }
}

checkUser()
