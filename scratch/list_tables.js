import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function listTables() {
  const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1)
  if (error) {
    console.error('Error selecting from profiles:', error.message)
    return
  }

  // We can't easily list tables via supabase-js without an RPC or raw SQL.
  // But we can check common names.
  const tables = ['profiles', 'users', 'accounts', 'members', 'staff']
  for (const t of tables) {
    const { error: tableError } = await supabaseAdmin.from(t).select('count', { count: 'exact', head: true })
    if (!tableError) {
      console.log(`Table exists: ${t}`)
    }
  }
}

listTables()
