
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function findGhostUser() {
  const target = 'umaralkhwarizmi@gmail.com'
  console.log('Searching for ghost user:', target)

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) { console.error('Error:', error.message); return }

  const users = data.users
  const match = users.find(u => u.email?.toLowerCase() === target.toLowerCase())

  if (match) {
    console.log('FOUND MATCHING USER:', {
      id: match.id,
      email: match.email,
      last_sign_in: match.last_sign_in_at,
      confirmed: match.email_confirmed_at ? 'YES' : 'NO'
    })
  } else {
    console.log('No user found in the list with that email.')
    
    // Cek juga metadata barangkali ada di sana
    const matchMeta = users.find(u => u.user_metadata?.email?.toLowerCase() === target.toLowerCase())
    if (matchMeta) {
      console.log('FOUND IN METADATA:', matchMeta.id)
    } else {
      console.log('Truly not found in auth.users list.')
    }
  }
}

findGhostUser()
