// Service worker de Panel Personal — cachea el app-shell para uso offline.
const CACHE = "panel-v15";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./css/style.css",
  "./js/supabase-config.js",
  "./js/state.js",
  "./js/utils.js",
  "./js/toast.js",
  "./js/nav.js",
  "./js/weather.js",
  "./js/home.js",
  "./js/finance.js",
  "./js/health.js",
  "./js/tasks.js",
  "./js/habits.js",
  "./js/calendar.js",
  "./js/config.js",
  "./js/backup.js",
  "./js/csv.js",
  "./js/cloud.js",
  "./js/report.js",
  "./js/lock.js",
  "./js/app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // El clima y la nube (Supabase) siempre van a la red; nunca se cachean.
  if (url.hostname.endsWith("open-meteo.com") || url.hostname.endsWith("supabase.co")) return;

  // App-shell: primero caché, luego red (y guarda copia de lo mismo-origen).
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (url.origin === self.location.origin && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
