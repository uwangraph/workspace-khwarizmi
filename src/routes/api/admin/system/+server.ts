import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/auth'
import { supabaseAdmin } from '$lib/server/supabase'
import { checkRateLimit } from '$lib/server/rateLimiter'

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
    const ip = event.getClientAddress()
    if (!checkRateLimit(ip, 10, 60000)) {
      return json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 })
    }

    await requireAdmin(event)
    const body = await event.request.json()
    const { action, confirm, days } = body

    if (action === 'schedule-deletion') {
      if (!confirm) return json({ error: 'Konfirmasi (confirm: true) diperlukan dari server' }, { status: 400 })
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
      if (!confirm) return json({ error: 'Konfirmasi (confirm: true) diperlukan untuk menghapus data' }, { status: 400 })
      await clearAllTransactionData()
      return json({ success: true })
    }

    if (action === 'cleanup-old-data') {
      if (!days) return json({ error: 'Parameter days diperlukan' }, { status: 400 })
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() - days)
      const thresholdString = thresholdDate.toISOString().split('T')[0]

      const { data: oldRecords } = await supabaseAdmin
        .from('attendance')
        .select('photo_in_url, photo_out_url')
        .lt('date', thresholdString)

      let deletedPhotosCount = 0
      if (oldRecords && oldRecords.length > 0) {
        const filesToDelete: string[] = []
        for (const record of oldRecords) {
          if (record.photo_in_url) {
            const parts = record.photo_in_url.split('/selfies/')
            if (parts.length > 1) filesToDelete.push(parts[1])
          }
          if (record.photo_out_url) {
            const parts = record.photo_out_url.split('/selfies/')
            if (parts.length > 1) filesToDelete.push(parts[1])
          }
        }
        const chunkSize = 100
        for (let i = 0; i < filesToDelete.length; i += chunkSize) {
          const chunk = filesToDelete.slice(i, i + chunkSize)
          await supabaseAdmin.storage.from('selfies').remove(chunk)
        }
        deletedPhotosCount = filesToDelete.length
      }

      await Promise.all([
        supabaseAdmin.from('attendance').delete().lt('date', thresholdString),
        supabaseAdmin.from('attendance_leaves').delete().lt('date', thresholdString),
        supabaseAdmin.from('attendance_penalties').delete().lt('date', thresholdString)
      ])

      return json({ success: true, deletedPhotos: deletedPhotosCount, thresholdDate: thresholdString })
    }

    return json({ error: 'Aksi tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}
