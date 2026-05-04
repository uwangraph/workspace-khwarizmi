
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function forceCleanup() {
  const email = 'umaralkhwarizmi@gmail.com'
  console.log('Attempting to capture ghost email:', email)

  // 1. Coba buat user baru dengan email tersebut
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    email_confirm: true,
    password: 'tempPassword123!'
  })

  if (createError) {
    console.log('CREATE ERROR (This might be good if it gives us an ID):', createError.message)
    // Jika error karena sudah ada, kita coba cari lagi lebih teliti
  } else {
    console.log('SUCCESSFULLY CAPTURED! User ID:', newUser.user.id)
    
    // 2. Jika berhasil ditangkap, hapus secara permanen
    console.log('Now performing Hard Delete to clear all traces...')
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id, true)
    
    if (deleteError) {
      console.error('Delete failed:', deleteError.message)
    } else {
      console.log('GHOST EMAIL CLEARED PERMANENTLY!')
    }
  }
}

forceCleanup()
