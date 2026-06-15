const CACHE_VERSION = 'v1';
const CACHE_NAME = `lord-system-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'lord-system-runtime';
const FALLBACK_CACHE = 'lord-system-fallback';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;800&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css',
  'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('fonts.googleapis') && !url.includes('cdn.jsdelivr')));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn('[SW] Erreur lors de la mise en cache:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== FALLBACK_CACHE) {
            console.log('[SW] Suppression du cache ancien:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de fetch - Cache First pour les assets statiques, Network First pour les autres
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Network First pour les requêtes API
  if (url.includes('/api/') || url.includes('maps') || url.includes('geolocation')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => cachedResponse || createFallbackResponse());
        })
    );
    return;
  }

  // Cache First pour les assets statiques (fonts, CSS, JS)
  if (
    url.includes('fonts.googleapis') ||
    url.includes('cdn.jsdelivr') ||
    url.includes('.js') ||
    url.includes('.css')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response.clone());
                });
              }
              return response;
            })
            .catch(() => createFallbackResponse());
        })
    );
    return;
  }

  // Stale While Revalidate pour les pages HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const cache = caches.open(RUNTIME_CACHE);
                cache.then((c) => c.put(event.request, response.clone()));
              }
              return response;
            })
            .catch(() => createFallbackResponse());

          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // Par défaut: Network First
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => cachedResponse || createFallbackResponse());
      })
  );
});

// Créer une réponse de secours
function createFallbackResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LORD SYSTEM — Hors ligne</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0500;
          color: #fff4e8;
          font-family: 'Tajawal', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .offline-container {
          text-align: center;
          background: rgba(20, 8, 0, 0.92);
          border: 1px solid rgba(232, 119, 34, 0.4);
          border-radius: 16px;
          padding: 40px 20px;
          max-width: 400px;
        }
        .offline-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 24px;
          color: #e87722;
          margin-bottom: 10px;
          font-family: 'Amiri', serif;
        }
        p {
          color: #c89060;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>أنت في وضع عدم الاتصال</h1>
        <p>يرجى التحقق من اتصالك بالإنترنت والعودة للتطبيق.</p>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8'
      })
    }
  );
}

// Message listener pour la mise à jour du cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker chargé et prêt');
