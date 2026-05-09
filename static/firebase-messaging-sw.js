// PURE VANILLA WEB PUSH SERVICE WORKER
// Didesain KHUSUS untuk menghindari bug Firebase onBackgroundMessage di Chrome Android

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');

  if (!event.data) {
    console.warn('[Service Worker] Push event has no data.');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Failed to parse push data as JSON', e);
    return;
  }

  console.log('[Service Worker] Push Payload:', payload);

  // Payload FCM bisa berupa 'data' (dari server kita) atau 'notification' (dari Firebase Console)
  const notificationObj = payload.notification || {};
  const dataObj = payload.data || {};

  const title = notificationObj.title || dataObj.title || 'Workspace Khwarizmi';
  const body = notificationObj.body || dataObj.message || 'Ada pemberitahuan baru.';
  const url = dataObj.url || '/';

  // Tag yang sangat unik agar notifikasi TIDAK ditumpuk oleh Chrome
  const uniqueTag = 'wk-' + Date.now() + '-' + Math.floor(Math.random() * 100000);

  const notificationOptions = {
    body: body,
    icon: '/logo-khwarizmi-192.png',
    badge: '/logo-khwarizmi-192.png',
    tag: uniqueTag,
    data: { url: url }, // Simpan URL untuk dipakai saat diklik
    vibrate: [200, 100, 200, 100, 200]
  };

  // 🚨 WAJIB: event.waitUntil MENCEGAH browser mematikan SW sebelum notifikasi muncul
  // Jika ini gagal/tidak dipanggil, Chrome akan memberikan PENALTY dan membisu notifikasi berikutnya
  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
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
