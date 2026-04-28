import { messaging } from '$lib/firebase';
import { getToken } from 'firebase/messaging';
import { supabase } from '$lib/supabase';

const VAPID_KEY = "BKUlxg6u9uo4nYt-gS74YyQmBqEf0k4QyjZa4DdVClAV28hDCESFkVXGmQP64bs2ChStSNAKaQZcckwVdU38cWE";

export const notificationService = {
  async requestPermissionAndGetToken(userId: string) {
    try {
      const msg = await messaging;
      if (!msg) return null;

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(msg, { vapidKey: VAPID_KEY });
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
  }
};
