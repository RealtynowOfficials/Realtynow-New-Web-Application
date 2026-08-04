const CACHE_NAME = 'realtynow-pwa-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon.png',
];

// 1. Install Event - Pre-cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate Event - Clean up stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Event Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Supabase API / auth endpoints from caching
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/')
  ) {
    return;
  }

  // A. Navigation / HTML pages -> Network First, Fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        }),
    );
    return;
  }

  // B. JS / CSS -> Network First, Fallback to Cache.
  // Cache-first is unsafe here: Vite hot-reload/dep-optimization and every new
  // deploy can change what a given script URL should return (including, in
  // dev, plain /src/*.tsx paths with no content hash at all). Serving a stale
  // cached module while a fresh HTML/other chunk expects the new one loads
  // two different copies of the same module (most dangerously React itself)
  // into the page — the exact cause of "Cannot read properties of null
  // (reading 'useX')" crashes. Falling back to cache only covers offline use.
  const isScriptOrStyle =
    event.request.destination === 'script' ||
    event.request.destination === 'worker' ||
    event.request.destination === 'style' ||
    /\.(m?js|css)(\?|$)/.test(url.pathname);

  if (isScriptOrStyle) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && url.origin === location.origin) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // C. Everything else (images, fonts, icons) -> Cache First, Fallback to Network.
  // Safe to cache-first: these are non-executable assets where brief
  // staleness is harmless, unlike code.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache freshness
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            /* silent offline */
          });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === location.origin || url.hostname.includes('fonts.'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }),
  );
});
