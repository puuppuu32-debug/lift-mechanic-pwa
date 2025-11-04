// sw.js v2 - Optimized caching
const CACHE_NAME = 'lift-mechanic-v4';
const STATIC_CACHE = 'static-assets-v4';

// Critical assets for App Shell
const staticAssets = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v4...');
  self.skipWaiting(); // Immediate activation
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(staticAssets);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated v4');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE) {
            console.log('Service Worker: Removing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Simple cache-first strategy for better performance
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache successful requests (excluding Firebase APIs)
            if (networkResponse.ok && 
                !event.request.url.includes('firestore.googleapis.com') &&
                !event.request.url.includes('firebaseio.com')) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Offline');
          });
      })
  );
});