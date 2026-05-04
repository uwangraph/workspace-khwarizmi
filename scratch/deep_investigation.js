
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function deepInvestigation() {
  const email = 'umaralkhwarizmi@gmail.com'
  console.log('Deep Investigation for:', email)

  // Coba signup paksa
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: 'PasswordBaru123!',
    email_confirm: true
  })

  if (error) {
    console.log('DETAILED ERROR:', JSON.stringify(error, null, 2))
  } else {
    console.log('CREATED SUCCESSFULLY (Wait, what happened before?):', data.user.id)
  }
}

deepInvestigation()
