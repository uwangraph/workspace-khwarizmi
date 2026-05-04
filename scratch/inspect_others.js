import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function inspectOtherTables() {
  const tables = ['accounts', 'members', 'staff']
  for (const t of tables) {
    console.log(`--- Checking ${t} ---`)
    const { data, error } = await supabaseAdmin.from(t).select('*').limit(1)
    if (error) {
      console.log(`Error checking ${t}: ${error.message}`)
    } else {
      console.log(`Columns in ${t}:`, Object.keys(data[0] || {}))
      // Search for the email string in the whole table if it's small
      const { data: searchData, error: searchError } = await supabaseAdmin.from(t).select('*')
      if (!searchError) {
        const found = searchData.find(row => JSON.stringify(row).includes('umaralkhwarizmi@gmail.com'))
        if (found) {
          console.log(`FOUND EMAIL IN TABLE ${t}!!! Row:`, found)
        }
      }
    }
  }
}

inspectOtherTables()
