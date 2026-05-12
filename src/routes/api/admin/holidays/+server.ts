import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase'
import { requireAdmin } from '$lib/server/auth'
import type { RequestEvent } from '@sveltejs/kit'

export async function POST(event: RequestEvent) {
  try {
    await requireAdmin(event)
    const holiday = await event.request.json()

    if (!holiday.name?.trim() || !holiday.date) {
      return json({ error: 'Nama dan tanggal wajib diisi' }, { status: 400 })
    }

    if (holiday.id) {
      const { data, error } = await supabaseAdmin
        .from('holidays')
        .update({ name: holiday.name, date: holiday.date })
        .eq('id', holiday.id)
        .select()
        .single()
      if (error) return json({ error: error.message }, { status: 400 })
      return json({ data })
    } else {
      const { data, error } = await supabaseAdmin
        .from('holidays')
        .insert({ name: holiday.name, date: holiday.date })
        .select()
        .single()
      if (error) return json({ error: error.message }, { status: 400 })
      return json({ data })
    }
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: err.status || 500 })
  }
}

export async function DELETE(event: RequestEvent) {
  try {
    await requireAdmin(event)
    const id = event.url.searchParams.get('id')
    if (!id) return json({ error: 'ID wajib diisi' }, { status: 400 })

    const { error } = await supabaseAdmin.from('holidays').delete().eq('id', id)
    if (error) return json({ error: error.message }, { status: 400 })
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: err.status || 500 })
  }
}
