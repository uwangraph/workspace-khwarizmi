
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTaskSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'tasks' })
  
  if (error) {
    // If RPC doesn't exist, try a simple select to see keys
    const { data: sample } = await supabase.from('tasks').select('*').limit(1)
    console.log('Sample task keys:', sample ? Object.keys(sample[0]) : 'No data')
    
    // Check types via a more direct query if possible, or just list keys
    if (sample && sample[0]) {
      console.log('Sample task data:', sample[0])
    }
  } else {
    console.log('Tasks Columns:', data)
  }
}

checkTaskSchema()
