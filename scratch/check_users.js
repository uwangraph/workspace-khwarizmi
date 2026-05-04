import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkUsers() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    console.error('Error listing users:', error.message)
    return
  }

  console.log('--- User List ---')
  users.forEach(u => {
    console.log(`ID: ${u.id}, Email: ${u.email}, Name: ${u.user_metadata?.full_name}`)
  })
  console.log('-----------------')
}

checkUsers()
