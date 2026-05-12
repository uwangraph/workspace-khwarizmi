import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase'
import { requireAuthenticated } from '$lib/server/auth'
import type { RequestEvent } from '@sveltejs/kit'
import { checkRateLimit } from '$lib/server/rateLimiter'

export async function POST(event: RequestEvent) {
  try {
    const ip = event.getClientAddress()
    if (!checkRateLimit(ip, 20, 60000)) {
      return json({ error: 'Terlalu banyak permintaan' }, { status: 429 })
    }
    const user = await requireAuthenticated(event)
    const { messageId, metadata } = await event.request.json()

    if (!messageId || !metadata) {
      return json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Verifikasi pesan ada dan ambil room_id-nya
    const { data: msg } = await supabaseAdmin
      .from('chat_messages')
      .select('room_id')
      .eq('id', messageId)
      .single()

    if (!msg) return json({ error: 'Pesan tidak ditemukan' }, { status: 404 })

    // Verifikasi user adalah peserta room — mencegah user luar memanipulasi metadata
    const { data: participant } = await supabaseAdmin
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', msg.room_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant) return json({ error: 'Akses ditolak' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ metadata })
      .eq('id', messageId)

    if (error) throw error

    return json({ success: true })
  } catch (err: any) {
    console.error('API /api/chat/metadata Error:', err)
    return json({ error: err.message }, { status: err.status || 500 })
  }
}
