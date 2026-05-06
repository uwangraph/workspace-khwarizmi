import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riykotdvxhabbplrogxj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeWtvdGR2eGhhYmJwbHJvZ3hqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIyMTE5MywiZXhwIjoyMDkxNzk3MTkzfQ.wZgwAjXpknQYG_s6CvJjAsxxxnVpz3Y9a7qAW8Vv800'
)

async function debug() {
  console.log('Fetching with Service Role...')
  const { data, error } = await supabase.from('attendance_leaves').select('*')
  if (error) console.error('Error:', error)
  else console.log('Leaves count (Service Role):', data?.length)
}

debug()
