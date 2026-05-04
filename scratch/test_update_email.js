import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testUpdateEmail() {
  const userId = '77594f8b-5e23-45db-8a34-2312d25b5a26'
  const newEmail = 'umaralkhwarizmi@gmail.com'

  console.log(`Attempting to change email for user ${userId} to ${newEmail}...`)

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true
  })

  if (error) {
    console.error('FAILED:', error)
  } else {
    console.log('SUCCESS:', data.user.email)
  }
}

testUpdateEmail()
