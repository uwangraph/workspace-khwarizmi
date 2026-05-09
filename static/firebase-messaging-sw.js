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

// WAJIB: Inisialisasi Firebase Messaging agar getToken() di client bisa bekerja.
// Tanpa ini, push subscription tidak akan terbuat.
const messaging = firebase.messaging();

// Untuk pesan dengan webpush.notification payload:
// Browser OTOMATIS menampilkan notifikasi tanpa kode apapun di sini.
// Kita TIDAK perlu self.addEventListener('push') atau messaging.onBackgroundMessage()
// karena notifikasi sudah di-handle langsung oleh browser dari payload server.

// Handler klik notifikasi — buka/fokus aplikasi saat notifikasi di-tap
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Cari tab yang sudah terbuka dan fokuskan
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
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
