// sw.js v7 - Enhanced offline first strategy
const CACHE_NAME = 'lift-mechanic-offline-first-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css', 
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-144x144.png',
  '/assets/icons/icon-152x152.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png'
];

// Установка - кэшируем критичные ресурсы
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with offline-first strategy');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell for offline first');
        return cache.addAll(APP_SHELL).catch(error => {
          console.log('Cache addAll error (some files might be missing):', error);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Активация - очищаем старые кэши
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated v3 - offline first');
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
    }).then(() => {
      // Claim clients immediately
      return self.clients.claim();
    })
  );
});

// Обработка сообщений от основного скрипта
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CRITICAL') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Стратегия: Оффлайн-первый для навигации, кэш-первый для статики
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Пропускаем не-GET запросы и Firebase
  if (request.method !== 'GET' || 
      request.url.includes('firestore.googleapis.com') ||
      request.url.includes('firebaseio.com') ||
      request.url.includes('googleapis.com')) {
    return;
  }

  // НАВИГАЦИОННЫЕ ЗАПРОСЫ - стратегия "оффлайн-первый"
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Сначала пробуем кэш
          const cachedResponse = await caches.match('/index.html');
          if (cachedResponse) {
            console.log('Serving index.html from cache');
            return cachedResponse;
          }
          
          // Если нет в кэше, пробуем сеть
          console.log('Fetching index.html from network');
          const networkResponse = await fetch(request);
          
          // Клонируем ответ для кэширования
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('/index.html', responseClone);
          });
          
          return networkResponse;
        } catch (error) {
          console.log('Network failed, serving offline page');
          // Если все провалилось - показываем offline.html
          const offlineResponse = await caches.match('/offline.html');
          return offlineResponse || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // СТАТИЧЕСКИЕ РЕСУРСИ - стратегия "кэш-первый"
  if (request.url.includes('/assets/') ||
      request.url.includes('/style.css') ||
      request.url.includes('/app.js') ||
      request.url.includes('/manifest.json')) {
    
    event.respondWith(
      (async () => {
        // Сначала ищем в кэше
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        try {
          // Если нет в кэше - сеть
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        } catch (error) {
          // Для CSS/JS возвращаем базовый контент вместо ошибки
          if (request.url.includes('.css')) {
            return new Response('body { background: #f0f0f0; }', {
              headers: { 'Content-Type': 'text/css' }
            });
          }
          if (request.url.includes('.js')) {
            return new Response('console.log("Offline mode");', {
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          return new Response('Resource not available offline', { status: 408 });
        }
      })()
    );
    return;
  }

  // ДЛЯ ВСЕХ ОСТАЛЬНЫХ ЗАПРОСОВ - пробуем сеть, потом кэш
  event.respondWith(
    fetch(request).catch(async () => {
      const cachedResponse = await caches.match(request);
      return cachedResponse || new Response('Offline', { status: 408 });
    })
  );
});