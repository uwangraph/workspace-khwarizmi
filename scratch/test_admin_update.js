
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testUpdate() {
  const currentEmail = 'umar@khwarizmi.co.id'
  const newEmail = 'umaralkhwarizmi@gmail.com'
  
  console.log('Finding user:', currentEmail)
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) { console.error('Error:', listError.message); return }

  const user = users.users.find(u => u.email === currentEmail)
  if (!user) { console.error('User not found!'); return }

  console.log('User ID found:', user.id)
  console.log('Attempting to update email to:', newEmail)

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true
  })

  if (error) {
    console.error('UPDATE FAILED:', error)
  } else {
    console.log('UPDATE SUCCESS:', data.user.email)
    
    // Kembalikan ke email semula agar user bisa login lagi
    console.log('Reverting email for testing purposes...')
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: currentEmail,
      email_confirm: true
    })
  }
}

testUpdate()
