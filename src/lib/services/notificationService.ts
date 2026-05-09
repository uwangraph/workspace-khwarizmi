import { messaging } from '$lib/firebase';
import { supabase } from '$lib/supabase';
import { PUBLIC_FIREBASE_VAPID_KEY } from '$env/static/public';

export const notificationService = {
  async requestPermissionAndGetToken(userId: string) {
    if (typeof window === 'undefined') return null;
    
    try {
      const { getToken } = await import('firebase/messaging');
      const msg = await messaging;
      if (!msg) {
        console.warn('[NotificationService] Firebase Messaging not supported/initialized.');
        return null;
      }

      // Pastikan Service Worker terdaftar secara eksplisit untuk menghindari konflik dengan PWA
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(msg, { 
          vapidKey: PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        if (token) {
          console.log('[NotificationService] FCM Token obtained:', token.substring(0, 10) + '...');
          await this.saveTokenToSupabase(userId, token);
          return token;
        } else {
          console.warn('[NotificationService] No registration token available. Request permission to generate one.');
        }
      } else {
        console.warn('[NotificationService] Notification permission denied.');
      }
    } catch (error) {
      console.error('[NotificationService] Error requesting notification permission:', error);
    }
    return null;
  },

  async saveTokenToSupabase(userId: string, token: string) {
    if (!token || !userId) return;
    
    // Gunakan upsert dengan filter untuk memastikan tidak ada duplikasi berlebih
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        { user_id: userId, token }, 
        { onConflict: 'token' }
      );
    
    if (error) {
      if (error.code === '42501') {
        console.warn('FCM Token: Policy RLS fcm_tokens belum dikonfigurasi (42501).');
      } else {
        console.error('Error saving FCM token:', error.message);
      }
    } else {
      console.log('[NotificationService] Token saved to Supabase.');
    }
  },

  async send(uid: string, type: string, title: string, message: string, data: Record<string, any> = {}) {
    // 1. Simpan ke database via RPC agar selalu berhasil (bypass RLS untuk user lain)
    const { error: rpcError } = await supabase.rpc('send_notification', {
      p_user_id: uid,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data || {}
    });

    if (rpcError) {
      console.warn('[NotificationService] RPC send_notification failed, trying direct insert:', rpcError);
      // Fallback terakhir
      await supabase.from('notifications').insert({ 
        user_id: uid, type, title, message, data, is_read: false 
      });
    }

    // 2. Panggil API khusus untuk memicu Push Notification (FCM)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, type, title, message, data, skip_db: true })
      });
      
      if (!response.ok) console.warn(`[NotificationService] Push API returned ${response.status}`);
    } catch (err) {
      console.warn('[NotificationService] Push API failed (non-fatal):', err);
    }
    
    return true;
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
