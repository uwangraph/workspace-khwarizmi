import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase'
import type { RequestEvent } from '@sveltejs/kit'

export async function POST({ request }: RequestEvent) {
  try {
    const { name, email, password, position, role } = await request.json()

    if (!name || !email || !password) {
      return json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })
    }

    // Buat user baru menggunakan admin API agar email tidak perlu dikonfirmasi
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (authError || !authData.user) {
      return json({ error: authError?.message || 'Gagal membuat akun' }, { status: 400 })
    }

    // Masukkan ke tabel profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      full_name: name,
      role: role || 'user',
      position: position || null
    })

    if (profileError) {
      // Rollback pembuatan auth jika gagal menyimpan profil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return json({ error: 'Gagal menyimpan profil pengguna' }, { status: 400 })
    }

    return json({ user: authData.user })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE({ url }: RequestEvent) {
  try {
    const userId = url.searchParams.get('id')
    if (!userId) return json({ error: 'User ID wajib diisi' }, { status: 400 })

    // Hapus auth user dulu (cascade akan hapus profile jika ada FK constraint)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      // Jika auth user tidak ditemukan, tetap coba hapus profile
      console.warn('[Admin] Auth user not found, deleting profile only:', authError.message)
    }

    // Hapus profile secara eksplisit (untuk keamanan)
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
    if (profileError) {
      return json({ error: 'Gagal menghapus profil pengguna' }, { status: 400 })
    }

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}
