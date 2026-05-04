import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function countUsers() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000
  })
  if (error) {
    console.error('Error listing users:', error.message)
    return
  }

  console.log(`Total users found: ${users.length}`)
  const found = users.find(u => u.email === 'umaralkhwarizmi@gmail.com')
  if (found) {
    console.log('FOUND IT! ID:', found.id)
  } else {
    console.log('STILL NOT FOUND.')
  }
}

countUsers()
