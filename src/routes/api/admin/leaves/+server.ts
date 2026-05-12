import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase'
import { requireAdmin } from '$lib/server/auth'
import type { RequestEvent } from '@sveltejs/kit'

export async function POST(event: RequestEvent) {
  try {
    const { user } = await requireAdmin(event)
    const { leaveId, status, rejectionNote } = await event.request.json()

    if (!leaveId || !status) {
      return json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(status)) {
      return json({ error: 'Status tidak valid' }, { status: 400 })
    }

    // approved_by didapat dari token, bukan dari client
    const updateData: Record<string, unknown> = { status, approved_by: user.id }
    if (status === 'rejected' && rejectionNote) {
      updateData.rejection_note = rejectionNote
    }

    const { error } = await supabaseAdmin
      .from('attendance_leaves')
      .update(updateData)
      .eq('id', leaveId)

    if (error) return json({ error: error.message }, { status: 400 })
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: err.status || 500 })
  }
}
