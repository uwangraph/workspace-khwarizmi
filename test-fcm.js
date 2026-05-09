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
const uid = 'ffc14c64-b2a0-4589-8f84-28898ad79cc2';

async function sendOne(i) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-fcm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      user_id: uid,
      title: `Notifikasi #${i}`,
      message: `Ini adalah tes notifikasi ke-${i}`,
      data: {}
    })
  });
  const text = await res.text();
  console.log(`#${i}: ${res.status} → ${text}`);
}

// Kirim 5 notifikasi berurutan dengan jeda 2 detik
for (let i = 1; i <= 5; i++) {
  await sendOne(i);
  if (i < 5) await new Promise(r => setTimeout(r, 2000));
}
