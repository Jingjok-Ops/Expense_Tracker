// ============================================================================
// FINFLOW - SERVICE WORKER FOR OFFLINE CACHING
// ============================================================================

const CACHE_NAME = 'finflow-cache-v85';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './styles/views/home.css',
    './styles/views/add.css',
    './styles/views/reports.css',
    './js/core.js',
    './js/views/home.js',
    './js/views/add.js',
    './js/views/reports.js',
    './js/main.js',
    './db.js',
    './manifest.json',
    './images/rich_cat.png',
    './images/poor_cat.png',
    './images/hug_cat.png',
    './images/smart_cat.png',
    './images/account_cat.png',
    './images/face_cat.png',
    './images/icon_cat.png'
];

// Install Event - cache core shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching core assets');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Stale-While-Revalidate caching strategy
self.addEventListener('fetch', (event) => {
    // Only intercept HTTP/HTTPS schemes (skips browser extensions, chrome-extension://, etc.)
    if (!event.request.url.startsWith('http')) return;

    // Bypass caching for local development (localhost, 127.0.0.1, 192.168.x.x, 172.x.x.x, 10.x.x.x)
    const url = new URL(event.request.url);
    const isLocal = url.hostname === 'localhost' || 
                    url.hostname === '127.0.0.1' || 
                    url.hostname.startsWith('192.168.') || 
                    url.hostname.startsWith('172.') || 
                    url.hostname.startsWith('10.');
    
    if (isLocal) {
        // Fetch directly from network for local testing to avoid caching issues during development
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached asset immediately, but update in the background if possible
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    })
                    .catch(() => {
                        // Ignore network issues when background fetching
                    });
                return cachedResponse;
            }

            // Fallback to network if asset not cached
            return fetch(event.request).then((networkResponse) => {
                // Cache successful responses from our origin dynamically
                if (networkResponse.status === 200) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            });
        })
    );
});
