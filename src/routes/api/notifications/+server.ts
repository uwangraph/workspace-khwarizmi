import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { sendPushNotification } from '$lib/server/fcm';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
  try {
    const { user_id, type, title, message, data } = await request.json();

    if (!user_id || !title || !message) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Simpan ke database
    const { error: dbError } = await supabaseAdmin.from('notifications').insert({
      user_id,
      type,
      title,
      message,
      data: data || {},
      is_read: false
    });

    if (dbError) {
      console.error('Error inserting notification to DB:', dbError);
      return json({ error: dbError.message }, { status: 500 });
    }

    // 2. Ambil token FCM untuk user ini
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (tokenError) {
      console.error('Error fetching FCM tokens:', tokenError);
    } else if (tokenData && tokenData.length > 0) {
      const tokens = tokenData.map(t => t.token);
      // 3. Kirim push notification
      await sendPushNotification(tokens, title, message, data);
    }

    return json({ success: true });
  } catch (err: any) {
    console.error('Error in notification API:', err);
    return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
