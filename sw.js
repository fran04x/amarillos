const CACHE_NAME = 'amarillos-app-v3';
const VIDEO_CACHE_NAME = 'amarillos-video-vault-v1'; // Aquí vivirá la bóveda

// Archivos locales que guardaremos para que la app abra sin internet
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './player.js',
    './data.js',
    './manifest.json'
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
    console.log('[Service Worker] Instalando motor...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Guardando App Shell');
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// 2. ACTIVACIÓN Y LIMPIEZA
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activado y listo');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== VIDEO_CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. INTERCEPTOR (El núcleo del modo offline)
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // REGLA 1: Peticiones de video a Hugging Face
    if (url.origin === 'https://fran04x-amarillos-app-stream.hf.space') {
        // (En el próximo paso, aquí interceptaremos para leer de la bóveda)
        // Por ahora, dejamos que pasen directo a internet.
        event.respondWith(fetch(event.request));
        return;
    }

    // REGLA 2: El resto de la web (HTML, CSS, JS)
    // Buscamos en la bóveda, si no está, vamos a internet.
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});