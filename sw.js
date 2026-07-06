const NOVA_CACHE = "nova-ai-v9-login-first";
const ASSETS = [
  "./",
  "index.html",
  "login.html",
  "dashboard.html",
  "styles.css",
  "main.js",
  "login.js",
  "dashboard.js",
  "config.js",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(NOVA_CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== NOVA_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        if (event.request.url.startsWith("http")) {
  caches.open(NOVA_CACHE).then((cache) =>
    cache.put(event.request, copy)
  );
}
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
