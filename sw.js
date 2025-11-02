// sw.js
const CACHE_NAME = 'lift-mechanic-v2';
const STATIC_CACHE = 'static-assets-v2';
const DYNAMIC_CACHE = 'dynamic-assets-v2';

// Файлы для предварительного кэширования (App Shell)
const staticAssets = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/sw.js'
];

// Установка и предварительное кэширование
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching Static Assets');
        return cache.addAll(staticAssets);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы и запросы к Firebase
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        
        // Для навигационных запросов - особая логика
        if (event.request.mode === 'navigate') {
          return await handleNavigationRequest(event.request, cachedResponse);
        }

        // Для статических ресурсов - стратегия Cache First
        if (isStaticAsset(event.request)) {
          return await handleStaticAsset(event.request, cachedResponse);
        }

        // Для документов - стратегия Network First
        if (isDocumentRequest(event.request)) {
          return await handleDocumentRequest(event.request, cachedResponse);
        }

        // По умолчанию - Network First
        return await handleDefaultRequest(event.request, cachedResponse);
      } catch (error) {
        console.log('Fetch failed:', error);
        // Фолбэк для оффлайн-режима
        const offlinePage = await caches.match('/offline.html');
        return offlinePage || new Response('Оффлайн режим', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Обработчики разных типов запросов
async function handleNavigationRequest(request, cachedResponse) {
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Возвращаем главную страницу для любых маршрутов в оффлайне
    const fallback = await caches.match('/index.html');
    return fallback || new Response('Оффлайн режим');
  }
}

async function handleStaticAsset(request, cachedResponse) {
  // Cache First для статических ресурсов
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error; // Пробрасываем ошибку для обработки в основном catch
  }
}

async function handleDocumentRequest(request, cachedResponse) {
  // Network First для документов (чтобы получать свежие версии)
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // В оффлайне возвращаем закэшированную версию
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Документ недоступен в оффлайн-режиме', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function handleDefaultRequest(request, cachedResponse) {
  // Stale-While-Revalidate для остальных запросов
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Вспомогательные функции для классификации запросов
function isStaticAsset(request) {
  return request.url.includes('/style.css') ||
         request.url.includes('/app.js') ||
         request.url.includes('/manifest.json') ||
         request.url.match(/\.(css|js|json|png|jpg|svg)$/);
}

function isDocumentRequest(request) {
  return request.url.match(/\.(pdf|doc|docx|xls|xlsx)$/) ||
         request.url.includes('/documents/');
}