// NGX Watchlist — Service Worker for Push Notifications
const CACHE_NAME = 'ngx-watchlist-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  console.log('NGX Watchlist SW installed');
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// ─── Push notification received ──────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'NGX Alert', body: e.data.text() }; }

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    tag: `ngx-${data.ticker || 'alert'}`,
    renotify: true,
    requireInteraction: true,  // Stays on screen until dismissed
    vibrate: [200, 100, 200, 100, 400],
    data: {
      url: data.url || '/',
      ticker: data.ticker,
      thesis: data.thesis,
      name: data.name
    },
    actions: [
      { action: 'view', title: '📊 View Chart' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification clicked ────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
