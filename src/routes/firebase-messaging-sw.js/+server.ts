import { 
  PUBLIC_FIREBASE_API_KEY, 
  PUBLIC_FIREBASE_AUTH_DOMAIN, 
  PUBLIC_FIREBASE_PROJECT_ID, 
  PUBLIC_FIREBASE_STORAGE_BUCKET, 
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID, 
  PUBLIC_FIREBASE_APP_ID 
} from '$env/static/public';

export const GET = () => {
  const swCode = `
    importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

    firebase.initializeApp({
      apiKey: "${PUBLIC_FIREBASE_API_KEY}",
      authDomain: "${PUBLIC_FIREBASE_AUTH_DOMAIN}",
      projectId: "${PUBLIC_FIREBASE_PROJECT_ID}",
      storageBucket: "${PUBLIC_FIREBASE_STORAGE_BUCKET}",
      messagingSenderId: "${PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
      appId: "${PUBLIC_FIREBASE_APP_ID}"
    });

    const messaging = firebase.messaging();

    function toBool(value) {
      return value === true || value === 'true';
    }

    function buildCallUrl(data) {
      const roomId = data.roomId || data.room_id;
      if (!roomId) return '/';

      const params = new URLSearchParams({
        incoming_call: '1',
        call_room_id: roomId,
        call_room_name: data.roomName || data.room_name || 'Panggilan',
        caller_id: data.callerId || data.caller_id || '',
        caller_name: data.callerName || data.caller_name || 'Pengguna',
        call_kind: data.kind || 'call',
        voice_only: String(toBool(data.voiceOnly || data.voice_only))
      });

      const path = data.kind === 'meeting' ? '/meeting/' : '/chat/';
      return path + encodeURIComponent(roomId) + '?' + params.toString();
    }

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      const data = payload.data || {};
      const isCall = data.type === 'call' || data.kind === 'call' || data.kind === 'meeting';
      const notificationTitle = payload.notification?.title || data.title || (isCall ? 'Panggilan Masuk' : 'Notifikasi');
      const notificationOptions = {
        body: payload.notification?.body || data.message || data.body || '',
        icon: '/logo-khwarizmi-192.png',
        badge: '/logo-khwarizmi-192.png',
        tag: isCall ? 'incoming-call-' + (data.roomId || data.room_id || 'workspace') : data.tag,
        renotify: isCall,
        requireInteraction: isCall,
        data: {
          ...data,
          url: isCall ? buildCallUrl(data) : (data.url || '/notifications')
        },
        actions: isCall ? [
          { action: 'open-call', title: 'Buka' }
        ] : []
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    self.addEventListener('notificationclick', (event) => {
      event.notification.close();

      const targetUrl = event.notification.data?.url || '/notifications';
      const absoluteUrl = new URL(targetUrl, self.location.origin).href;

      event.waitUntil((async () => {
        const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
          if ('focus' in client) {
            await client.focus();
            if ('navigate' in client) return client.navigate(absoluteUrl);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(absoluteUrl);
      })());
    });
  `;

  return new Response(swCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
};
