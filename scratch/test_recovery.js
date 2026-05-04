
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testRecovery() {
  const email = 'umaralkhwarizmi@gmail.com'
  console.log('Testing recovery email for:', email)

  // Test 1: Check if user exists
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
  if (!usersError) {
    const user = usersData.users.find(u => u.email === email)
    console.log(`Does user exist in auth.users? ${user ? 'YES' : 'NO'}`)
  }

  // Test 2: Try reset password
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:5173/auth/reset',
  })

  if (error) {
    console.error('RECOVERY ERROR DETAILS:', JSON.stringify(error, null, 2))
  } else {
    console.log('RECOVERY EMAIL SENT SUCCESSFULLY!')
  }
}

testRecovery()
