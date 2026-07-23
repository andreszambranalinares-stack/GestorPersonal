// Service worker de Panel Personal — cachea el app-shell para uso offline.
const CACHE = "panel-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // El clima siempre va a la red (nunca se cachea); si no hay red, que falle y la app usa su fallback.
  if (url.hostname.endsWith("open-meteo.com")) return;

  // App-shell: primero caché, luego red (y guarda copia de lo mismo-origen).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (url.origin === self.location.origin && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
