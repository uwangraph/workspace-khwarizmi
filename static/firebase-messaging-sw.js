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

// Inisialisasi Firebase Messaging di Service Worker
// WAJIB dipanggil agar getToken() di client bisa menautkan push subscription ke SW ini
const messaging = firebase.messaging();

// Handler untuk pesan push yang datang saat app di background/tertutup
// Menggunakan native 'push' event listener untuk reliabilitas maksimal di mobile
self.addEventListener('push', function(event) {
  // Jika tidak ada data, jangan proses
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    // Jika bukan JSON, abaikan
    return;
  }

  // FCM Data-Only message: data ada di payload.data
  // FCM Notification message: data ada di payload.notification
  const title = payload.notification?.title || payload.data?.title || 'Workspace Khwarizmi';
  const body = payload.notification?.body || payload.data?.message || 'Ada informasi baru untuk Anda.';
  
  const notificationOptions = {
    body: body,
    icon: '/logo-khwarizmi-192.png',
    badge: '/logo-khwarizmi-192.png',
    // Tag HARUS unik per notifikasi agar tidak saling menimpa
    tag: 'wk-' + Date.now() + '-' + Math.floor(Math.random() * 99999),
    data: payload.data || {},
    vibrate: [200, 100, 200, 100, 200],
    renotify: true // Paksa getar/bunyi walau tag berbeda
  };

  // KRITIS: event.waitUntil() WAJIB dipanggil agar browser tidak membunuh SW
  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
