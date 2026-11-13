/* Service worker: precarga todos los recursos para que la app funcione sin conexión.
 * Sube CACHE_VERSION en cada despliegue para invalidar la caché antigua. */
const CACHE_VERSION = 'ifbb-agent-v24';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/exerciseMuscles.js',
  './js/perfilArticular.js',
  './js/knowledge.js',
  './js/engine.js',
  './js/exerciseImages.js',
  './js/sessionStore.js',
  './js/core-v2/registro.js',
  './js/core-v2/perfilArticularVariantes.js',
  './js/core-v2/catalogo.js',
  './js/core-v2/reparto.js',
  './js/core-v2/plan.js',
  './js/core-v2/almacen.js',
  './js/core-v2/aviso.js',
  './js/core-v2/sesion.js',
  './js/core-v2/dolor.js',
  './js/core-v2/textos.js',
  './js/core-v2/cardio.js',
  './js/core-v2/pantallas/comun.js',
  './js/core-v2/pantallas/editor.js',
  './js/core-v2/pantallas/perfil.js',
  './js/core-v2/pantallas/entreno.js',
  './js/core-v2/pantallas/sesion.js',
  './js/core-v2/pantallas/progreso.js',
  './js/core-v2/pantallas/montaje.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Red primero: si hay conexión, siempre se sirve y se guarda la versión más
// reciente (evita quedarse "una visita atrás" como pasaba con cache-first).
// Sin conexión, cae a lo último guardado.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(res => {
      if (res && res.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(event.request, copy));
      }
      return res;
    }).catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
