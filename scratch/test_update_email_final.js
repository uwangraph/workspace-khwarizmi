
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function finalForceUpdate() {
  const userId = '77594f8b-5e23-45db-8a34-2312d25b5a26'
  const targetEmail = 'umaralkhwarizmi@gmail.com'
  
  console.log('FINAL ATTEMPT: Forcing email to:', targetEmail)

  // Kita coba update TANPA email_confirm, benar-benar mentah
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: targetEmail
  })

  if (error) {
    console.error('FINAL ATTEMPT FAILED:', error)
    
    if (error.message.includes('Database error')) {
      console.log('--- DIAGNOSIS ---')
      console.log('Masalahnya ada di Database Supabase Anda (Trigger/Fungsi SQL).')
      console.log('Kemungkinan ada fungsi otomatis yang melarang email ini.')
    }
  } else {
    console.log('FINAL ATTEMPT SUCCESS:', data.user.email)
  }
}

finalForceUpdate()
