import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.log('Missing env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function test() {
  const { data, error } = await supabase.from('chat_messages').select('id, metadata').limit(1)
  console.log('Message:', data)
  if (error) console.error(error)
}

test()
