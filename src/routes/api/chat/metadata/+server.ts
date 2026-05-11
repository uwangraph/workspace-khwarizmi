import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { env } from '$env/dynamic/private'
import { env as publicEnv } from '$env/dynamic/public'

export async function POST({ request }) {
  try {
    const { messageId, metadata } = await request.json()
    
    if (!messageId || !metadata) {
      return json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      publicEnv.PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ metadata })
      .eq('id', messageId)
      
    if (error) throw error
    
    return json({ success: true })
  } catch (err: any) {
    console.error('API /api/chat/metadata Error:', err)
    return json({ error: err.message }, { status: 500 })
  }
}
