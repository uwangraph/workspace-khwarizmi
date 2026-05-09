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

// Kita tidak perlu memanggil firebase.messaging() di sini karena kita akan menangani 'push' secara native
// Ini jauh lebih stabil di PWA Mobile (Android/iOS) daripada menggunakan onBackgroundMessage bawaan Firebase yang sering bug/throttle.

self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Native Push Received');
  
  if (!event.data) return;

  try {
    const payload = event.data.json();
    console.log('[firebase-messaging-sw.js] Payload:', payload);

    // Karena Edge Function mengirim format Data-Only, datanya ada di payload.data
    const title = payload.data?.title || 'Workspace Khwarizmi';
    const body = payload.data?.message || 'Ada informasi baru untuk Anda.';
    
    const notificationOptions = {
      body: body,
      icon: '/logo-khwarizmi-192.png',
      badge: '/logo-khwarizmi-192.png',
      tag: payload.data?.tag || 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      data: payload.data,
      vibrate: [200, 100, 200, 100, 200]
      // requireInteraction: true -> Sering bermasalah di Android, kita hapus saja agar notif stabil
    };

    // WAJIB menggunakan event.waitUntil agar OS Android/iOS tahu bahwa SW sedang bekerja
    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  } catch (err) {
    console.error('[firebase-messaging-sw.js] Error parsing push data', err);
  }
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
