import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim();
  }
});

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  const uid = 'ffc14c64-b2a0-4589-8f84-28898ad79cc2'; 
  
  const res = await fetch(`${supabaseUrl}/functions/v1/send-fcm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      user_id: uid,
      title: `Test Data Message`,
      message: `Message Body`,
      data: {}
    })
  });
  
  const text = await res.text();
  console.log(`Response: ${res.status}`);
  console.log(text);
}

test();
