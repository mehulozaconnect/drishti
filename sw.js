const V = 'drishti-v7';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/content.js', 'js/grow.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // network first for everything on our origin, cache as fallback for offline
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((ca) => ca.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname.includes('/data/') }).then((m) => m || caches.match('index.html'))));
});
