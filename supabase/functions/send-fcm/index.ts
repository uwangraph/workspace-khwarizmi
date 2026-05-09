import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import admin from "npm:firebase-admin@13.8.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inisialisasi Firebase Admin (Hanya sekali per instance)
if (!admin.apps.length) {
  const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
      console.log('Firebase Admin initialized.')
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e)
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT secret is not set.')
  }
}

serve(async (req) => {
  // Tangani preflight request (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { user_ids, user_id, title, message, data } = body
    
    // Support both single user_id and array of user_ids for backward compatibility
    const uids = user_ids ? user_ids : (user_id ? [user_id] : []);
    
    if (uids.length === 0 || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Buat client Supabase Admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ambil FCM Token milik semua user tujuan
    const { data: tokenData, error } = await supabaseClient
      .from('fcm_tokens')
      .select('token')
      .in('user_id', uids)
      
    if (error || !tokenData || tokenData.length === 0) {
      return new Response(JSON.stringify({ success: false, reason: 'No tokens found for user' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const tokens = tokenData.map(t => t.token)

    // Konversi semua payload data menjadi string (syarat dari FCM)
    const safeData = data ? Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ) : {};

    // Menggunakan payload DATA-ONLY murni.
    // Tidak ada objek 'notification' sama sekali agar FCM tidak ikut campur.
    // Notifikasi akan ditangani 100% manual oleh Service Worker kita via event 'push'.
    const payload = {
      data: {
        title: title,
        message: message,
        ...safeData
      },
      tokens: tokens,
      android: {
        // WAJIB untuk Android Doze Mode: memaksa perangkat membangunkan Service Worker
        priority: 'high'
      },
      webpush: {
        // WAJIB untuk Chrome Web Push: mencegah throttling
        headers: {
          Urgency: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            // content-available: 1 berfungsi membangunkan aplikasi iOS di background
            'content-available': 1
          }
        },
        headers: {
          'apns-priority': '10'
        }
      }
    }

    // Kirim Push Notification via Firebase
    const response = await admin.messaging().sendEachForMulticast(payload)
    
    // Bersihkan token yang sudah expired/invalid
    const failedTokens = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        failedTokens.push(tokens[idx])
      }
    })
    
    // Hapus token expired dari database agar tidak menumpuk
    if (failedTokens.length > 0) {
      await supabaseClient
        .from('fcm_tokens')
        .delete()
        .in('token', failedTokens)
      console.log(`Cleaned up ${failedTokens.length} expired tokens`)
    }

    console.log(`FCM sent: ${response.successCount} success, ${response.failureCount} failed`)

    return new Response(JSON.stringify({ 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Error in send-fcm:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
