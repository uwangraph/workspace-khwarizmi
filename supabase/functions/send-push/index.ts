import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    // Handle both direct invocation (payload) and webhook invocation (payload.record)
    const { user_id, user_ids, title, message, data } = payload.record ? payload.record : payload

    const targetUserIds = user_ids ? user_ids : (user_id ? [user_id] : [])
    
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: "No user_id or user_ids provided" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
    }

    // 1. Ambil Secrets
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Ambil Token FCM User
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', targetUserIds)

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No tokens found for user(s)" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
    }

    // 3. Dapatkan Access Token Google (OAuth2 v1)
    const accessToken = await getAccessToken(serviceAccount)

    const stringData = data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}
    const isCall = stringData.type === 'call' || stringData.kind === 'call' || stringData.kind === 'meeting'
    const roomId = stringData.roomId || stringData.room_id
    const path = stringData.kind === 'meeting' ? '/meeting/' : '/chat/'
    const callLink = isCall && roomId
      ? `${path}${encodeURIComponent(roomId)}?${new URLSearchParams({
          incoming_call: '1',
          call_room_id: roomId,
          call_room_name: stringData.roomName || stringData.room_name || 'Panggilan',
          caller_id: stringData.callerId || stringData.caller_id || '',
          caller_name: stringData.callerName || stringData.caller_name || 'Pengguna',
          call_kind: stringData.kind || 'call',
          voice_only: stringData.voiceOnly || stringData.voice_only || 'false'
        }).toString()}`
      : (stringData.url || '/notifications')
    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL') || ''
    const absoluteCallLink = siteUrl && callLink.startsWith('/')
      ? `${siteUrl.replace(/\/$/, '')}${callLink}`
      : callLink
    const fcmOptions = absoluteCallLink.startsWith('https://')
      ? { link: absoluteCallLink }
      : undefined

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
              // Call: data-only agar CallFCMService handle full-screen intent + ringtone
              // Non-call: pakai notification block agar FCM handle langsung
              ...(isCall ? {} : { notification: { title, body: message } }),
              data: {
                ...stringData,
                title,
                message,
                url: callLink
              },
              android: {
                priority: 'high',
                ...(isCall ? {} : {
                  notification: {
                    channel_id: 'chat_messages_v2',
                    default_sound: true,
                    default_vibrate_timings: true
                  }
                })
              },
              webpush: isCall ? undefined : {
                fcm_options: fcmOptions,
                notification: {
                  icon: '/logo-khwarizmi-192.png',
                  badge: '/logo-khwarizmi-192.png',
                  requireInteraction: false
                }
              }
            }
          })
        }
      )
      return fcmResponse.status
    }))

    console.log(`[FCM] Berhasil mengirim ke ${results.filter(s => s === 200).length} perangkat.`)

    return new Response(JSON.stringify({ success: true, status_codes: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[FCM Error]", err.message)
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 })
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
