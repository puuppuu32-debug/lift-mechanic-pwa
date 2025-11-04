// sw.js v3 - Simple and reliable
const CACHE_NAME = 'lift-mechanic-simple-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing simple version');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated simple version');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Пропускаем все Firebase запросы и не-GET запросы
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Только для статических ресурсов нашего приложения
  if (event.request.url.includes('/style.css') ||
      event.request.url.includes('/app.js') ||
      event.request.url.includes('/manifest.json')) {
    
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              return fetch(event.request)
                .then((networkResponse) => {
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                })
                .catch(() => {
                  return new Response('Offline');
                });
            });
        })
    );
  }
});