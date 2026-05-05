import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts"

serve(async (req) => {
  try {
    const { record } = await req.json()
    const { user_id, title, message, data } = record

    // 1. Ambil Secrets
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Ambil Token FCM User
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id)

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No tokens found for user" }), { status: 200 })
    }

    // 3. Dapatkan Access Token Google (OAuth2 v1)
    const accessToken = await getAccessToken(serviceAccount)

    // 4. Kirim ke setiap token (Multicast)
    const results = await Promise.all(tokenRows.map(async (row: any) => {
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: { title, body: message },
              data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}
            }
          })
        }
      )
      return fcmResponse.status
    }))

    console.log(`[FCM] Berhasil mengirim ke ${results.filter(s => s === 200).length} perangkat.`)

    return new Response(JSON.stringify({ success: true, status_codes: results }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[FCM Error]", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

async function getAccessToken(key: any) {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  
  const jwt = await create({ alg: "RS256", typ: "JWT" }, {
    iss: key.client_email,
    sub: key.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
    scope: "https://www.googleapis.com/auth/cloud-platform"
  }, await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array(atob(key.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "")).split("").map(c => c.charCodeAt(0))),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  ))

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  
  const data = await res.json()
  return data.access_token
}
