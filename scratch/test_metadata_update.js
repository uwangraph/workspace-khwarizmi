
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testMetadata() {
  const userId = '77594f8b-5e23-45db-8a34-2312d25b5a26' // ID Umar
  
  console.log('Attempting to update metadata for user:', userId)

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { last_tested_at: new Date().toISOString() }
  })

  if (error) {
    console.error('METADATA UPDATE FAILED:', error)
  } else {
    console.log('METADATA UPDATE SUCCESS:', data.user.user_metadata)
  }
}

testMetadata()
