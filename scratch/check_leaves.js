import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
for (let line of envStr.split('\n')) {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) env.url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) env.key = line.split('=')[1].trim();
}
const supabaseAdmin = createClient(env.url, env.key);
async function check() {
  const { data, error } = await supabaseAdmin.from('attendance_leaves').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(data, error);
}
check();
