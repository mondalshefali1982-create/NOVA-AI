const NOVA_CACHE = "nova-ai-v1";
const ASSETS = [
  "index.html",
  "dashboard.html",
  "styles.css",
  "main.js",
  "dashboard.js",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(NOVA_CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
