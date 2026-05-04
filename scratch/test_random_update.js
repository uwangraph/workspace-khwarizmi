
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testRandomEmail() {
  const userId = '77594f8b-5e23-45db-8a34-2312d25b5a26'
  const randomEmail = `test_${Date.now()}@example.com`
  
  console.log('Testing with random email:', randomEmail)

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: randomEmail,
    email_confirm: true
  })

  if (error) {
    console.error('RANDOM UPDATE FAILED:', error)
  } else {
    console.log('RANDOM UPDATE SUCCESS:', data.user.email)
    
    // Kembalikan ke email semula
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: 'umar@khwarizmi.co.id',
      email_confirm: true
    })
  }
}

testRandomEmail()
