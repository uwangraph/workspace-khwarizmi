import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { sendPushNotification } from '$lib/server/fcm';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
  try {
    const { user_id, type, title, message, data } = await request.json();

    if (!user_id || !title || !message) {
      return json({ error: 'Missing required fields: user_id, title, message' }, { status: 400 });
    }

    // 1. Simpan ke database via service role (bypass RLS)
    const { error: dbError } = await supabaseAdmin.from('notifications').insert({
      user_id,
      type: type || 'task_revision',
      title,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : {},  // strip undefined values
      is_read: false
    });

    if (dbError) {
      console.error('[Notifications API] DB insert error:', dbError.message, dbError.details);
      // Return 400 for DB constraint errors, 500 for server errors
      const status = dbError.code?.startsWith('23') ? 400 : 500;
      return json({ error: dbError.message, details: dbError.details }, { status });
    }

    // 2. Ambil token FCM user dan kirim push notification (non-blocking)
    const { data: tokenData } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (tokenData && tokenData.length > 0) {
      const tokens = tokenData.map((t: any) => t.token);
      sendPushNotification(tokens, title, message, data).catch(err => {
        console.error('[Notifications API] Push notification failed (non-fatal):', err.message);
      });
    }

    return json({ success: true });
  } catch (err: any) {
    console.error('[Notifications API] Unexpected error:', err);
    return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
