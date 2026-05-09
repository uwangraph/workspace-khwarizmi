// PURE VANILLA WEB PUSH SERVICE WORKER
// Didesain untuk menerima pesan bertipe 'Notification'
// sehingga browser/OS yang menangani tampilan notifikasi secara native (seperti WhatsApp).

// HANYA handle klik notifikasi untuk membuka aplikasi
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
