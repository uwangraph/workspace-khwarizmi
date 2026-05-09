import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase.from('chat_rooms').select('*').limit(1)
  if (error) {
    console.error("DB Error:", error.message)
  } else {
    console.log("DB Success:", data)
  }
}
test()
