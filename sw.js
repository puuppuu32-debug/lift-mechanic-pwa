// sw.js v4 - Enhanced offline support
const CACHE_NAME = 'lift-mechanic-enhanced-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with enhanced caching');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Кэшируем КРИТИЧЕСКИЕ ресурсы для оффлайн работы
        return cache.addAll([
          '/',
          '/offline.html',
          '/style.css', 
          '/app.js',
          '/manifest.json'
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated enhanced version');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Пропускаем Firebase запросы и не-GET
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Для навигационных запросов (HTML страниц)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // При ошибке сети возвращаем оффлайн страницу
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Для статических ресурсов
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
                return new Response('Offline resource');
              });
          });
      })
  );
});