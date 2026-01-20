/**
 * MINIMAL SERVICE WORKER - Notifications Only (Production Safe)
 * 
 * This is a minimal service worker focused on push notifications.
 * It does NOT cache any resources or block network requests.
 * The website works perfectly without installing as PWA.
 * 
 * IMPORTANT: This SW is designed to NOT break the app in production.
 * It will gracefully handle errors and allow the app to function normally.
 * 
 * Version: 2.0.0 - Vercel/Production compatible
 */

const SW_VERSION = 'prod-safe-v2';

// Wrap everything in try-catch to prevent SW from breaking the app
try {
  // Install event - clear all caches, don't block
  self.addEventListener('install', (event) => {
    console.log('[SW] Installing v' + SW_VERSION);
    
    // Clear any existing caches without blocking
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        ))
        .then(() => console.log('[SW] All caches cleared'))
        .catch(() => {
          // Silently fail - don't block app
        })
    );
    
    // Immediately activate - don't wait
    self.skipWaiting();
  });

  // Activate event - take control immediately
  self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v' + SW_VERSION);
    
    event.waitUntil(
      Promise.all([
        // Clear any remaining caches
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .catch(() => {}),
        // Take control of all clients
        self.clients.claim()
      ]).catch(() => {})
    );
  });

  // Push notification handling (optional feature)
  self.addEventListener('push', (event) => {
    // Don't block if push fails
    if (!event.data) return;
    
    let data = {
      title: 'PSControl',
      body: 'Você tem uma nova notificação',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/' }
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
      // Silently fail - use defaults
      return;
    }

    const options = {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [100, 50, 100],
      data: data.data,
      requireInteraction: false, // Don't force user interaction
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

      const urlToOpen = event.notification.data?.url || '/';

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
    } catch (e) {
      // Silently fail
    }
  });

  // Fetch event - NEVER intercept, always go to network
  // This ensures the site behaves like a normal website
  self.addEventListener('fetch', () => {
    // Do nothing - let browser handle all requests normally
    // This is critical for Vercel/production compatibility
    return;
  });

  // Message handling - combined listener
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
          self.registration.unregister()
            .then(() => console.log('[SW] Unregistered'))
            .catch(() => {});
          break;
          
        case 'GET_VERSION':
          if (event.source) {
            event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
          }
          break;
      }
    } catch (e) {
      // Silently fail
    }
  });

} catch (globalError) {
  // If anything fails during SW setup, log it but don't break
  console.error('[SW] Setup error (non-fatal):', globalError);
}

// Self-healing: If SW becomes unresponsive, it can be easily replaced
console.log('[SW] Service Worker v' + SW_VERSION + ' loaded');
