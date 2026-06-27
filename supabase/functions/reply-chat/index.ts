import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, room_id, message } = await req.json()

    if (!user_id || !room_id || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'user_id, room_id, dan message wajib diisi' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verifikasi user adalah peserta room
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', room_id)
      .eq('user_id', user_id)
      .single()

    if (!participant) {
      return new Response(JSON.stringify({ error: 'User bukan peserta room ini' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403
      })
    }

    const { error } = await supabase.from('chat_messages').insert({
      room_id,
      sender_id: user_id,
      content: message.trim(),
      type: 'text'
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }
})
