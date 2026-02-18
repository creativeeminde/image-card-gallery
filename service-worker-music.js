const APP_CACHE_NAME = 'gym-app-shell-v2';
const DATA_CACHE_NAME = 'gym-app-data-v2';

// 1. URLs for the app shell to be cached immediately
const APP_SHELL_URLS = [
    'music.html', // IMPORTANT: Rename your 'gym (2).html' to 'index.html'
    'manifest-music.json',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap'
];

// 2. Install Event: Cache the app shell
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 3. Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== APP_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 4. Fetch Event: Serve cached content
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Strategy 1: Supabase API Data (Stale-While-Revalidate)
  // This serves cached data first (stale) then updates it from the network.
  if (url.origin.includes('supabase.co') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const networkFetch = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(err => {
            console.error('[Service Worker] Fetch error:', err);
            // If network fails, still return the cached response if it exists
            return cachedResponse; 
          });

          // Return cached response immediately if it exists, otherwise wait for network
          return cachedResponse || networkFetch;
        });
      })
    );
  } 
  // Strategy 2: App Shell & Other Assets (Cache-First)
  // This serves from cache. If not in cache, it fetches from network and caches it.
  else if (APP_SHELL_URLS.includes(url.pathname) || 
           url.origin === 'https://fonts.gstatic.com' ||
           event.request.destination === 'style' ||
           event.request.destination === 'script') 
  {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response; // Serve from cache
        }
        // Not in cache, fetch and cache
        return fetch(event.request).then(networkResponse => {
          return caches.open(APP_CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
  // Strategy 3: Other requests (e.g., Supabase POST/PUT/DELETE)
  // We don't cache these, but we will handle failures in the client-side JS.
  else {
    event.respondWith(fetch(event.request));
  }
});
