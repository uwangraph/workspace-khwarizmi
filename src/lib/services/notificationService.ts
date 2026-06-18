import { messaging } from '$lib/firebase';
import { supabase } from '$lib/supabase';
import { PUBLIC_FIREBASE_VAPID_KEY } from '$env/static/public';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let nativePushListenersReady = false;

async function createAndroidChannels() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.createChannel({
      id: 'chat_messages_v2',
      name: 'Pesan Chat',
      description: 'Notifikasi pesan chat masuk',
      importance: 3, // IMPORTANCE_DEFAULT — ada suara & vibrasi
      vibration: true,
      visibility: 1
    });
    await PushNotifications.createChannel({
      id: 'incoming_call_v2',
      name: 'Panggilan Masuk',
      description: 'Notifikasi panggilan masuk',
      importance: 4, // IMPORTANCE_HIGH — heads-up + suara keras
      vibration: true,
      visibility: 1
    });
  } catch (e) {
    console.warn('[NotificationService] Failed to create channels:', e);
  }
}

export const notificationService = {
  async requestPermissionAndGetToken(userId: string) {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      await createAndroidChannels();
      return await this.requestNativePermissionAndGetToken(userId);
    }

    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return null;
    
    try {
      // 🚨 KRITIS: Harus dipanggil SEGERA (sebelum await lain) agar iOS mengenali User Gesture
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('[NotificationService] Notification permission denied or dismissed.');
        return null;
      }

      // Registrasi firebase-messaging-sw.js sebagai Service Worker TERPISAH dari PWA SW
      // Scope '/firebase-cloud-messaging-push-scope' adalah scope khusus Firebase
      // Push subscription akan terikat ke SW ini, BUKAN ke PWA SW (sw.js)
      const firebaseSW = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      
      // Tunggu sampai SW aktif
      // await navigator.serviceWorker.ready;
      // console.log('[NotificationService] Firebase SW registered at scope:', firebaseSW.scope);

      const { getToken } = await import('firebase/messaging');
      const msg = await messaging;
      if (!msg) {
        console.warn('[NotificationService] Firebase Messaging not supported/initialized.');
        return null;
      }

      const token = await getToken(msg, { 
        vapidKey: PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: firebaseSW  // <-- Gunakan Firebase SW, BUKAN PWA SW
      });
        
      if (token) {
        // console.log('[NotificationService] FCM Token obtained:', token.substring(0, 10) + '...');
        await this.saveTokenToSupabase(userId, token);
        return token;
      } else {
        console.warn('[NotificationService] No registration token available.');
      }
    } catch (error) {
      console.error('[NotificationService] Error requesting notification permission:', error);
    }
    return null;
  },

  async requestNativePermissionAndGetToken(userId: string) {
    if (!userId) return null;

    try {
      if (!nativePushListenersReady) {
        nativePushListenersReady = true;

        await PushNotifications.addListener('registration', async (token) => {
          try {
            await this.saveTokenToSupabase(userId, token.value);
            console.log('[NotificationService] Native push token saved.');
          } catch (error) {
            console.error('[NotificationService] Failed to save native push token:', error);
          }
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('[NotificationService] Native push registration failed:', error);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data || {};
          const url = data.url || data.link;
          if (typeof url === 'string' && url.length > 0) {
            window.location.assign(url);
          }
        });
      }

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive !== 'granted') {
        console.warn('[NotificationService] Native push permission denied.');
        return null;
      }

      await PushNotifications.register();
      return true;
    } catch (error) {
      console.error('[NotificationService] Error requesting native push permission:', error);
      return null;
    }
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
      throw new Error('Gagal menyimpan token notifikasi.');
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

    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('send-push', {
        body: { user_id: uid, title, message, data }
      });
      
      if (funcError) console.warn(`[NotificationService] Edge Function returned error:`, funcError);
    } catch (err) {
      console.warn('[NotificationService] Edge Function failed (non-fatal):', err);
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
    if (!uids || uids.length === 0) return;
    
    // 1. Simpan ke database via RPC untuk semua user secara paralel
    await Promise.all(uids.map(uid => supabase.rpc('send_notification', {
      p_user_id: uid,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data || {}
    })));

    // 2. Panggil Supabase Edge Function SEKALI untuk semua user
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('send-push', {
        body: { user_ids: uids, title, message, data }
      });
      
      if (funcError) console.warn(`[NotificationService] Edge Function returned error for bulk:`, funcError);
    } catch (err) {
      console.warn('[NotificationService] Edge Function failed for bulk (non-fatal):', err);
    }
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
