/* Service worker — solo caché del app shell. Sin push: los avisos
   aparecen al abrir la app. Sube la versión del caché al cambiar archivos. */
var CACHE = "inventario-medicamentos-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  // Solo cachear archivos del mismo origen (el app shell). Las consultas
  // a Open Food Facts y al CDN del escáner van siempre a la red.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      });
    }).catch(function () {
      if (event.request.mode === "navigate") return caches.match("./index.html");
      return undefined;
    })
  );
});
