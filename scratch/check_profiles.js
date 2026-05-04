
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkTable() {
  console.log('Checking profiles table structure...')
  
  // Ambil satu data contoh untuk melihat kolomnya
  const { data, error } = await supabaseAdmin.from('profiles').select('*').limit(1)
  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns in profiles table:', Object.keys(data[0]))
    console.log('Sample data:', data[0])
  } else {
    console.log('Table is empty.')
  }
}

checkTable()
