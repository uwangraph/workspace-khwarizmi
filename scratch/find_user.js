import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function findUser() {
  const email = 'umaralkhwarizmi@gmail.com'
  console.log(`Searching for user with email: ${email}`)

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
  
  const found = users.find(u => u.email === email)
  if (found) {
    console.log('FOUND USER:', found.id)
  } else {
    console.log('NOT FOUND in current list.')
    // Try to create a dummy user with this email to see if it's really available
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'TemporaryPassword123!',
      email_confirm: true
    })
    
    if (createError) {
      console.log('Error creating dummy user (proves it is taken):', createError.message)
    } else {
      console.log('Dummy user created successfully (proves it was available). Deleting it now...')
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
    }
  }
}

findUser()
