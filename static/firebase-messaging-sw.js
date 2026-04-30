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
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Notifikasi Baru';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'Anda mendapatkan notifikasi baru dari Workspace Khwarizmi',
    icon: '/logo-khwarizmi-192.png',
    badge: '/logo-khwarizmi-192.png',
    tag: 'notif-' + Date.now(),
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event);
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
