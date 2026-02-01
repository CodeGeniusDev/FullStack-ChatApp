// OPTIMIZED Service Worker - v2.0
const CACHE_VERSION = 'ChatGeniusX-v1.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Only cache true static assets
const STATIC_ASSETS = [
  '/avatar.png',
  '/favicon.ico',
  '/bg.png',
  '/icon.png'
];

// Install - cache only essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - NEVER cache HTML/JS/CSS, use stale-while-revalidate for images
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // NEVER CACHE these (always fetch from network):
  const noCachePatterns = [
    /\.html$/,
    /\.js$/,
    /\.jsx$/,
    /\.mjs$/,
    /\.css$/,
    /\/api\//,
    /\/socket\.io\//,
    /^(ws|wss):/
  ];
  
  if (noCachePatterns.some(pattern => pattern.test(url.pathname))) {
    return event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => new Response('', { status: 503 }))
    );
  }
  
  // Stale-while-revalidate for images
  const imagePattern = /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i;
  if (imagePattern.test(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          const fetchPromise = fetch(request)
            .then(response => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => cache.put(request, clone));
              }
              return response;
            })
            .catch(() => cached);
          
          return cached || fetchPromise;
        })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'New Message', {
      body: data.body || 'You have a new message',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(list => {
        const client = list.find(c => c.url === event.notification.data);
        return client ? client.focus() : clients.openWindow(event.notification.data);
      })
  );
});
