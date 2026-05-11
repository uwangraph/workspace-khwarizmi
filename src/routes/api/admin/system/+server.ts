import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth'
import { supabaseAdmin } from '$lib/server/supabase'

async function clearAllTransactionData() {
  const results = await Promise.all([
    supabaseAdmin
      .from('task_assignments')
      .delete()
      .neq('task_id', '00000000-0000-0000-0000-000000000000'),
    supabaseAdmin
      .from('tasks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'),
    supabaseAdmin
      .from('attendance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'),
    supabaseAdmin
      .from('attendance_leaves')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'),
    supabaseAdmin
      .from('attendance_penalties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'),
    supabaseAdmin
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'),
    supabaseAdmin
      .from('fcm_tokens')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000')
  ])

  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}

export async function POST(event: RequestEvent) {
  try {
    await requireAdmin(event)
    const { action } = await event.request.json()

    if (action === 'schedule-deletion') {
      const now = new Date().toISOString()
      const { error } = await supabaseAdmin
        .from('app_settings')
        .update({ deletion_scheduled_at: now })
        .eq('id', 1)

      if (error) return json({ error: error.message }, { status: 400 })
      return json({ success: true, deletion_scheduled_at: now })
    }

    if (action === 'cancel-deletion') {
      const { error } = await supabaseAdmin
        .from('app_settings')
        .update({ deletion_scheduled_at: null })
        .eq('id', 1)

      if (error) return json({ error: error.message }, { status: 400 })
      return json({ success: true })
    }

    if (action === 'clear-transaction-data') {
      await clearAllTransactionData()
      return json({ success: true })
    }

    return json({ error: 'Aksi tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}
