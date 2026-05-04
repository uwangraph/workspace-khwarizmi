
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testComparison() {
  const fakeEmail = 'email_pasti_tidak_ada_123456789@example.com'
  console.log('Testing with definitely fake email:', fakeEmail)

  const { error } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password: 'PasswordNgaco123!'
  })

  console.log('RESPONSE FOR FAKE EMAIL:', error?.message)
}

testComparison()
