import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { sendPushNotification } from '$lib/server/fcm';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
  try {
    const { user_id, type, title, message, data, skip_db } = await request.json();

    if (!user_id || !title || !message) {
      return json({ error: 'Missing required fields: user_id, title, message' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error('[Notifications API] supabaseAdmin is not initialized!');
      return json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!skip_db) {
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
        const status = dbError.code?.startsWith('23') ? 400 : 500;
        return json({ error: dbError.message, details: dbError.details }, { status });
      }

      console.log(`[Notifications API] Success saving notification to DB for user: ${user_id}`);
    } else {
      console.log(`[Notifications API] Skipping DB insert (skip_db=true) for user: ${user_id}`);
    }

    // 2. Ambil token FCM user dan kirim push notification (non-blocking)
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (tokenError) {
      console.error('[Notifications API] Error fetching FCM tokens:', tokenError.message);
    }

    if (tokenData && tokenData.length > 0) {
      const tokens = tokenData.map((t: any) => t.token);
      console.log(`[Notifications API] Sending push to ${tokens.length} devices for user: ${user_id}`);
      sendPushNotification(tokens, title, message, data).catch(err => {
        console.error('[Notifications API] Push notification failed:', err.message);
      });
    } else {
      console.log(`[Notifications API] No FCM tokens found for user: ${user_id}. Skipping push.`);
    }

    return json({ success: true });
  } catch (err: any) {
    console.error('[Notifications API] Unexpected error:', err);
    return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
