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

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo-khwarizmi.png',
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  `;

  return new Response(swCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
};
