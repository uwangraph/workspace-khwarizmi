
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY // Pake Anon Key buat simulasi user biasa

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function simulateLogin() {
  const email = 'umaralkhwarizmi@gmail.com'
  console.log('Simulating login for:', email)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'SalahSatuPassword123!'
  })

  if (error) {
    console.log('LOGIN RESPONSE ERROR:', error.message)
  } else {
    console.log('LOGIN RESPONSE SUCCESS (Wait, how?):', data)
  }
}

simulateLogin()
