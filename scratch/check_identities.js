import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkIdentities() {
  const userId = '77594f8b-5e23-45db-8a34-2312d25b5a26' // Uwan
  
  // We can't directly list all identities easily via admin SDK without a specific user ID
  // but we can check the identities of our user
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
  
  if (error) {
    console.error('Error getting user:', error.message)
    return
  }

  console.log('User identities:', user.identities)
}

checkIdentities()
