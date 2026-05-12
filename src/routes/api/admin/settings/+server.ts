import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase'
import { requireAdmin } from '$lib/server/auth'
import type { RequestEvent } from '@sveltejs/kit'

const ALLOWED_SETTING_KEYS = ['office_lat', 'office_lng', 'office_radius', 'office_locations', 'admin_contact']

export async function POST(event: RequestEvent) {
  try {
    const { user } = await requireAdmin(event)
    const body = await event.request.json()
    const { action } = body

    if (action === 'update-settings') {
      const filtered = Object.fromEntries(
        Object.entries(body.settings || {}).filter(([k]) => ALLOWED_SETTING_KEYS.includes(k))
      )
      if (Object.keys(filtered).length === 0) {
        return json({ error: 'Tidak ada field yang valid untuk diperbarui' }, { status: 400 })
      }
      const { error } = await supabaseAdmin.from('app_settings').update(filtered).eq('id', 1)
      if (error) return json({ error: error.message }, { status: 400 })
      return json({ success: true })
    }

    if (action === 'save-special-rule') {
      const rule = body.rule
      if (!rule?.date || !rule?.type) {
        return json({ error: 'Data aturan tidak lengkap' }, { status: 400 })
      }
      // Paksa created_by dari user yang terautentikasi, abaikan nilai dari client
      const { data, error } = await supabaseAdmin
        .from('special_rules')
        .upsert({ ...rule, created_by: user.id }, { onConflict: 'date' })
        .select()
        .single()
      if (error) return json({ error: error.message }, { status: 400 })
      return json({ data })
    }

    if (action === 'delete-special-rule') {
      const { id } = body
      if (!id) return json({ error: 'ID wajib diisi' }, { status: 400 })
      const { error } = await supabaseAdmin.from('special_rules').delete().eq('id', id)
      if (error) return json({ error: error.message }, { status: 400 })
      return json({ success: true })
    }

    return json({ error: 'Aksi tidak dikenali' }, { status: 400 })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: err.status || 500 })
  }
}
