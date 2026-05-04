import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function checkAssignments() {
  const { data: assignments, error: assignError } = await supabaseAdmin.from('task_assignments').select('*')
  const { data: tasks, error: taskError } = await supabaseAdmin.from('tasks').select('*')
  
  if (assignError || taskError) {
    console.error('Error:', assignError || taskError)
    return
  }

  console.log(`Total Tasks: ${tasks.length}`)
  console.log(`Total Assignments: ${assignments.length}`)
  
  tasks.forEach(t => {
    const taskAssigns = assignments.filter(a => a.task_id === t.id)
    console.log(`Task: "${t.title}" (ID: ${t.id}) has ${taskAssigns.length} assignees.`)
  })
}

checkAssignments()
