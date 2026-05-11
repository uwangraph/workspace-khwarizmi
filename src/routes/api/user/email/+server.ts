import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestEvent } from '@sveltejs/kit';
import { requireSelfOrAdmin } from '$lib/server/auth';

export async function POST(event: RequestEvent) {
  try {
    const { newEmail, userId } = await event.request.json();

    if (!newEmail || !userId) {
      return json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    await requireSelfOrAdmin(event, userId);

    // Gunakan admin API untuk mengubah email dan mem-bypass konfirmasi email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true
    });

    if (error) {
      console.error('[API/Email] Supabase error:', error);
      return json({ 
        error: error.message, 
        details: error,
        code: error.status 
      }, { status: 400 });
    }

    return json({ success: true, user: data.user });
  } catch (err: any) {
    console.error('[API/Email] Server error:', err);
    return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
