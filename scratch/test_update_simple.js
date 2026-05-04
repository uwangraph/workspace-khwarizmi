
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testUpdateSimple() {
  const userId = '77594f8b-5e23-45db-8a34-2312d25b5a26' // ID Umar
  const newEmail = 'umaralkhwarizmi@gmail.com'
  
  console.log('Attempting simple email update for:', userId)

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: newEmail
    // Tanpa email_confirm: true
  })

  if (error) {
    console.error('SIMPLE UPDATE FAILED:', error)
  } else {
    console.log('SIMPLE UPDATE SUCCESS:', data.user.email)
  }
}

testUpdateSimple()
