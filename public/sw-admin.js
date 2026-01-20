/**
 * ADMIN SERVICE WORKER - Notifications Only (Production Safe)
 * 
 * This is a minimal service worker for the admin panel.
 * It does NOT cache any resources or block network requests.
 * 
 * Version: 2.0.0 - Vercel/Production compatible
 */

const SW_VERSION = 'admin-prod-safe-v2';

try {
  // Install event - clear all caches, don't block
  self.addEventListener('install', (event) => {
    console.log('[SW-Admin] Installing v' + SW_VERSION);
    
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW-Admin] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        ))
        .then(() => console.log('[SW-Admin] All caches cleared'))
        .catch(() => {})
    );
    
    self.skipWaiting();
  });

  // Activate event - take control immediately
  self.addEventListener('activate', (event) => {
    console.log('[SW-Admin] Activating v' + SW_VERSION);
    
    event.waitUntil(
      Promise.all([
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .catch(() => {}),
        self.clients.claim()
      ]).catch(() => {})
    );
  });

  // Push notification handling
  self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    let data = {
      title: 'PSControl Admin',
      body: 'Você tem uma nova notificação',
      icon: '/admin-icon-192.png',
      badge: '/admin-icon-192.png',
      data: { url: '/admin/dashboard' }
    };

    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || data.data
      };
    } catch (e) {
      return;
    }

    const options = {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [100, 50, 100],
      data: data.data,
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options).catch(() => {})
    );
  });

  // Notification click handling
  self.addEventListener('notificationclick', (event) => {
    try {
      event.notification.close();

      if (event.action === 'close') return;

      const urlToOpen = event.notification.data?.url || '/admin/dashboard';

      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clientList) => {
            for (const client of clientList) {
              if (client.url.includes(self.location.origin) && 'focus' in client) {
                client.navigate(urlToOpen);
                return client.focus();
              }
            }
            if (self.clients.openWindow) {
              return self.clients.openWindow(urlToOpen);
            }
          })
          .catch(() => {})
      );
    } catch (e) {}
  });

  // Fetch event - NEVER intercept
  self.addEventListener('fetch', () => {
    return;
  });

  // Message handling
  self.addEventListener('message', (event) => {
    if (!event.data) return;
    
    try {
      switch (event.data.type) {
        case 'SKIP_WAITING':
          self.skipWaiting();
          break;
          
        case 'CLEAR_CACHES':
          caches.keys()
            .then((names) => Promise.all(names.map((n) => caches.delete(n))))
            .catch(() => {});
          break;
          
        case 'UNREGISTER':
          self.registration.unregister().catch(() => {});
          break;
          
        case 'GET_VERSION':
          if (event.source) {
            event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
          }
          break;
      }
    } catch (e) {}
  });

} catch (globalError) {
  console.error('[SW-Admin] Setup error (non-fatal):', globalError);
}

console.log('[SW-Admin] Service Worker v' + SW_VERSION + ' loaded');
