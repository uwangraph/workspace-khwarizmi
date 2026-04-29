import { messaging } from '$lib/firebase';
import { getToken } from 'firebase/messaging';
import { supabase } from '$lib/supabase';
import { PUBLIC_FIREBASE_VAPID_KEY } from '$env/static/public';

export const notificationService = {
  async requestPermissionAndGetToken(userId: string) {
    try {
      const msg = await messaging;
      if (!msg) return null;

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(msg, { vapidKey: PUBLIC_FIREBASE_VAPID_KEY });
        if (token) {
          await this.saveTokenToSupabase(userId, token);
          return token;
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    return null;
  },

  async saveTokenToSupabase(userId: string, token: string) {
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({ user_id: userId, token }, { onConflict: 'token' });
    
    if (error) {
      console.error('Error saving FCM token to Supabase:', error);
    }
  },

  async send(uid: string, type: string, title: string, message: string, data: Record<string, any> = {}) {
    try {
      // Bypass RLS menggunakan RPC sesuai dokumen
      const { error } = await supabase.rpc('send_notification', { 
        p_user_id: uid, 
        p_type: type, 
        p_title: title, 
        p_message: message, 
        p_data: data 
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('RPC failed, falling back to direct insert:', err);
      // Strategy 2: Direct insert (fallback)
      const { error } = await supabase.from('notifications').insert({ 
        user_id: uid, type, title, message, data, is_read: false 
      });
      return !error;
    }
  },

  // [TAMBAHAN]: Pindahkan logika subscribe dari +layout.svelte ke sini
  subscribeRealtime(userId: string, onNewNotification: (payload: any) => void) {
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => onNewNotification(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async sendBulk(uids: string[], type: string, title: string, message: string, data: Record<string, any> = {}) {
    await Promise.all(uids.map(uid => this.send(uid, type, title, message, data)));
  },

  async getNotifications(userId: string, limit: number = 100) {
    return await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  async markAsRead(notificationId: string) {
    return await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  },

  async markAsUnread(notificationId: string) {
    return await supabase.from('notifications').update({ is_read: false }).eq('id', notificationId);
  },

  async markAllAsRead(userId: string) {
    return await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  },

  async deleteAll(userId: string) {
    return await supabase.from('notifications').delete().eq('user_id', userId);
  },

  async deleteNotification(id: string) {
    return await supabase.from('notifications').delete().eq('id', id);
  },

  async getUnreadCount(userId: string) {
    return await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }
};
