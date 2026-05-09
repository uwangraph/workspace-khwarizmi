import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim();
  }
});

const adminClient = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: users } = await adminClient.from('profiles').select('id').limit(2);
  const uid = users[0].id;
  
  console.log("Testing RPC for user:", uid);
  const { data, error } = await anonClient.rpc('send_notification', {
    p_user_id: uid,
    p_type: 'task_collaboration_invite',
    p_title: 'Test Title',
    p_message: 'Test Message',
    p_data: {}
  });
  
  console.log("RPC Error:", error?.message || error);

  console.log("\nTesting Direct Insert...");
  const { error: e2 } = await anonClient.from('notifications').insert({
    user_id: uid,
    type: 'task_collaboration_invite',
    title: 'Test Direct',
    message: 'Test Direct',
    is_read: false
  });
  
  console.log("Direct Error:", e2?.message || e2);
}

test();
