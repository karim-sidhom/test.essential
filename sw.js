const CACHE_NAME = 'lord-system-v1';
const urlsToCache = [
  './',
  './lord-system-pwa.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;800&family=DM+Mono:wght@400;500&display=swap'
];

// Install Event - Cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache opened');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('⚠️ Some resources failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          // Update cache in background
          if (!event.request.url.includes('googleapis')) {
            fetch(event.request)
              .then((freshResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, freshResponse);
                });
              })
              .catch(() => {});
          }
          return response;
        }

        // Fetch from network if not cached
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a successful response
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Offline fallback
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#0a0500;color:#fff;text-align:center;padding:50px;font-family:sans-serif"><h1>📡 No Connection</h1><p>vous êtes hors ligne - تم قطع الاتصال</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
      })
  );
});

// Background Sync (for future feature)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-locations') {
    event.waitUntil(
      fetch('/api/sync-locations')
        .then(() => {
          console.log('✅ Locations synced');
        })
        .catch(() => {
          console.log('⚠️ Sync failed, will retry');
        })
    );
  }
});

// Periodic Background Sync (optional)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-prayer-times') {
    event.waitUntil(
      fetch('/api/prayer-times')
        .then(() => {
          console.log('✅ Prayer times updated');
          // Show notification
          self.registration.showNotification('أوقات الصلاة', {
            body: 'تم تحديث مواقيت الصلاة',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><text x="24" y="36" font-size="40" text-anchor="middle">🕌</text></svg>',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%230a0500" width="192" height="192"/><text x="96" y="140" font-size="120" text-anchor="middle" fill="%23e87722">🕌</text></svg>'
          });
        })
        .catch(() => {
          console.log('⚠️ Prayer times update failed');
        })
    );
  }
});

// Message Handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
