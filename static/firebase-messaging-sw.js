importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC0Gpv9GISMSKAfKKV0FDn436ZE9T4wpa0",
  authDomain: "khwarizmi-attendance.firebaseapp.com",
  projectId: "khwarizmi-attendance",
  storageBucket: "khwarizmi-attendance.firebasestorage.app",
  messagingSenderId: "346078156513",
  appId: "1:346078156513:web:bf268fa32a8bd29dcb09a0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Ambil data dari payload. Ada kemungkinan dikirim via 'notification' atau 'data'
  const title = payload.notification?.title || payload.data?.title || 'Workspace Khwarizmi';
  const body = payload.notification?.body || payload.data?.message || 'Ada informasi baru untuk Anda.';
  
  const notificationOptions = {
    body: body,
    icon: '/logo-khwarizmi-192.png',
    badge: '/logo-khwarizmi-192.png',
    tag: payload.data?.tag || 'notif-' + Date.now(),
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true // Menjaga notifikasi tetap ada sampai diklik (khusus desktop)
  };

  // Tampilkan notifikasi
  return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification.tag);
  
  event.notification.close();

  // Ambil URL target dari data jika ada, default ke root
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Cari jika ada tab yang sudah terbuka
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada tab terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
