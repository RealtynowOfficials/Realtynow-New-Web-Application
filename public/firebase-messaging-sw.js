// Firebase config is not secret (protected by Firebase Security Rules, not
// secrecy), but this file is static and can't read Vite env vars at build
// time — so the client passes config via the registration URL's query
// string (see enablePush() in src/lib/push.ts) and we read it back here.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

// Fires when a push arrives while no tab has focus — the only case FCM
// itself won't auto-render a notification for us.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'RealtyNow';
  const body = payload.notification?.body || '';
  const link = payload.fcmOptions?.link || payload.data?.link || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { link },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(link) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
