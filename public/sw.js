/* SEAN: Self-Funded — service worker
   只快取同源 App 殼(離線也能開)。
   ⚠ 絕不攔截跨源請求 → Google Fonts 直接走網路,不影響字型與同步。 */
const CACHE = 'sean-rpg-v2-dojo';
const ASSETS = [
  './', './index.html',
  './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 跨源(API/字型)不管,原生走網路

  // 導覽請求:網路優先,失敗回快取的 index(離線可開)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // 其他同源資源:快取優先,順便回填
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => hit))
  );
});
