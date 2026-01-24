// Service Worker for PWA functionality
const CACHE_NAME = "chat-app-v1";
const urlsToCache = [
  "/avatar.png",
  "/favicon.ico",
  "/bg.png"
];

// Install event - cache static assets only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Cache installation failed:", error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - NEVER cache HTML, JS, or CSS files
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Skip caching for:
  // - HTML files
  // - JavaScript modules (.js, .jsx, .mjs)
  // - CSS files
  // - API calls
  // - WebSocket connections
  const skipCache = 
    event.request.method !== 'GET' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.jsx') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/socket.io/') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:';

  if (skipCache) {
    // Always fetch from network for these resources
    return event.respondWith(fetch(event.request));
  }

  // For static assets (images, fonts), use cache-first strategy
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Only cache successful responses for images and static assets
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Only cache image files and fonts
          const isStaticAsset = 
            url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i);

          if (isStaticAsset) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        });
      })
      .catch(() => {
        // For navigation requests, return nothing (let browser handle)
        if (event.request.mode === 'navigate') {
          return new Response('', { status: 404 });
        }
        return new Response('', { status: 404 });
      })
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "New Message";
  const options = {
    body: data.body || "You have a new message",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "chat-notification",
    requireInteraction: false,
    data: data.url || "/",
    actions: [
      {
        action: "open",
        title: "Open Chat",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/icon-96x96.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (let client of clientList) {
            if (client.url === event.notification.data && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data || "/");
          }
        })
    );
  }
});

// Background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  console.log("Syncing messages...");
}
