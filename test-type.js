import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n');
let url = '', key = '';
env.forEach(line => {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  const uid = users[0].id;

  const { error } = await supabase.from('notifications').insert({
    user_id: uid, type: 'admin_reminder', title: 'test', message: 'test'
  });
  console.log("Error inserting admin_reminder:", error ? error.message : "Success");
}
run();
