// A unique name for the cache
const CACHE_NAME = 'habit-tracker-cache-v1';

// The list of files to cache
// This should include all the essential files for your app to work offline
const urlsToCache = [
  './habits.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
];

// Install event: This is triggered when the service worker is first installed.
self.addEventListener('install', event => {
  // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the specified assets to the cache
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache assets during install:', error);
      })
  );
});

// Activate event: This is triggered when the service worker is activated.
// It's a good place to clean up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If the cache name is not in our whitelist, delete it
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: This is triggered for every network request made by the page.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests for our caching strategy
  if (event.request.method !== 'GET') {
    return;
  }

  // Respond with a cached version of the resource if available, otherwise fetch from the network.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the resource is in the cache, return it
        if (response) {
          return response;
        }

        // If the resource is not in the cache, fetch it from the network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone the response because it's a one-time-use stream
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Add the new resource to the cache
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetching failed:', error);
            // You could return a custom offline page here if you want
            throw error;
        });
      })
  );
});
