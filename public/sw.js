/* Offline cache: the whole app (vs CPU and pass & play) works without a network. */
const CACHE = 'uno-arena-v27';
const ASSETS = ['./', 'index.html', 'css/style.css', 'vendor/gsap.min.js', 'js/shared/engine.js', 'js/shared/patti.js', 'js/shared/pro.js', 'js/shared/bots.js', 'js/shared/controller.js',
  'js/client/icons.js', 'js/client/pattiCards.js', 'js/client/cards.js', 'js/client/sound.js', 'js/client/rules.js', 'js/client/demo.js', 'js/client/demos.js', 'js/client/table.js', 'js/client/net.js', 'js/client/app.js', 'icon.svg', 'img/uno-logo.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/ws')) return;
  // images: straight from the cache (instant backgrounds), refreshed quietly in the background
  if (/\.(webp|jpe?g|png|svg)$/i.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // everything else: network first so updates arrive, cache as fallback for offline play
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
