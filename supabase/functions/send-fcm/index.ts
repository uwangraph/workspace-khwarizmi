import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import admin from "npm:firebase-admin@11.11.1"

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
    const { user_id, title, message, data } = await req.json()
    
    if (!user_id || !title) {
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

    // Ambil FCM Token milik user tujuan
    const { data: tokenData, error } = await supabaseClient
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id)
      
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

    // Kirim pesan Data-Only agar Service Worker (onBackgroundMessage) bisa menangani
    // dan memunculkan notifikasi secara manual dengan tag unik (mencegah notif tertimpa).
    const payload = {
      data: {
        title: title,
        message: message,
        ...safeData
      },
      tokens: tokens
    }

    // Kirim Push Notification via Firebase
    const response = await admin.messaging().sendMulticast(payload)
    console.log(`Successfully sent message:`, response)

    return new Response(JSON.stringify({ success: true, response }), { 
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
