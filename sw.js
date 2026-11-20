const V = 'drishti-v19';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/content.js', 'js/grow.js', 'js/todo.js', 'js/paper.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // always ask the server first (skipping the browser's 10-minute cache), fall back to the saved copy offline
  const net = e.request.mode === 'navigate' ? fetch(u.href, { cache: 'no-cache' }) : fetch(e.request, { cache: 'no-cache' });
  e.respondWith(net.then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((ca) => ca.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname.includes('/data/') }).then((m) => m || caches.match('index.html'))));
});
