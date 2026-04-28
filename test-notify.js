import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf8').split('\n');
let url = '', key = '';
env.forEach(line => {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (!users || users.length === 0) { console.log('No users found'); return; }
  const uid = users[0].id;

  const res = await fetch('http://localhost:5174/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: uid,
      type: 'test',
      title: 'test title',
      message: 'test message'
    })
  });
  
  console.log('API Status:', res.status);
  const text = await res.text();
  console.log('API Response:', text);
  
  const { data: notif } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
  console.log('DB Notif:', notif);
}

run();
