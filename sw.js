// sw.js v6 - Updated for assets/icons and new structure
const CACHE_NAME = 'lift-mechanic-full-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  // Добавляем основные иконки
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-144x144.png',
  '/assets/icons/icon-152x152.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/maskable-icon.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with updated app shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell with icons');
        // Кэшируем основные ресурсы, игнорируем ошибки для отдельных файлов
        return cache.addAll(APP_SHELL.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch(error => {
          console.log('Cache addAll error:', error);
          // Продолжаем даже если некоторые файлы не найдены
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated v2');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Пропускаем Firebase запросы и не-GET
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  // Для навигационных запросов
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Обновляем кэш при успешном запросе
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // При оффлайне возвращаем закэшированное приложение
          return caches.match('/index.html')
            .then(response => response || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Для иконок и статических ресурсов - кэшируем более агрессивно
  if (event.request.url.includes('/assets/icons/') ||
      event.request.url.includes('/style.css') ||
      event.request.url.includes('/app.js')) {
    
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Возвращаем из кэша если есть
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Иначе загружаем и кэшируем
          return fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone));
              }
              return networkResponse;
            })
            .catch(() => {
              // Для иконок возвращаем базовую иконку если оригинал недоступен
              if (event.request.url.includes('/assets/icons/')) {
                return caches.match('/assets/icons/icon-192x192.png');
              }
              return new Response('Resource not available offline');
            });
        })
    );
    return;
  }

  // Общая стратегия для остальных запросов
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Возвращаем кэш если есть, иначе сеть
        return cachedResponse || fetch(event.request)
          .then(networkResponse => {
            // Кэшируем успешные ответы
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
            // Для API запросов возвращаем JSON с offline флагом
            if (event.request.url.includes('/api/')) {
              return new Response(JSON.stringify({ 
                offline: true,
                message: "You are offline"
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
            return new Response('Offline', { 
              status: 408,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Обработка сообщений от основного скрипта
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});