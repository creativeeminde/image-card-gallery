const CACHE_NAME = 'gallery-app-v1';

// Assets required for the app to function offline (The "App Shell")
const ASSETS_TO_CACHE = [
  './',
  './oldindex.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js',
  'https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.42.3/dist/umd/supabase.min.js'
];

// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Handle network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. STRATEGY: Network First for Supabase (Data)
  // We want fresh data. If offline, fail gracefully or serve cached if available (optional)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 2. STRATEGY: Stale-While-Revalidate for App Shell (HTML/CSS/JS Libs)
  // Serve cached content immediately, then update cache in background
  if (ASSETS_TO_CACHE.some(asset => event.request.url.includes(asset)) || event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. STRATEGY: Cache First (or Standard Browser Cache) for Images/Videos
  // We don't manually cache large media in the SW to avoid storage quota limits.
  // We let the browser handle standard HTTP caching for media.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
