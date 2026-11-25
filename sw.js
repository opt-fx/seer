// Seer service worker: lets the installed app open and work offline.
// Scope is this app's own folder (/seer/), so it never touches the other OPT apps on the same site.
// The page opens from the saved copy straight away and the latest build is fetched in the background, so a new
// release shows on the launch after it is published. Cache names start with "seer-" and only those are ever deleted.
const VERSION = '22';                 // keep in step with the build number in index.html
const CACHE = 'seer-b' + VERSION, FONTS = 'seer-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
              './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/icon.svg', './fonts/Michroma-Regular.ttf'];

// Files are fetched straight from the site when a new version installs, never an older copy from the browser's cache.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('seer-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {                       // the page: open the saved copy at once, fetch the latest in the background
    const net = fetch(req).then(r => {                 // for the next launch (the update note appears then)
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return r;
    });
    e.respondWith(caches.match('./index.html').then(hit => hit || net).catch(() => net));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {   // fonts: cached copy, refreshed in the background
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));   // this app's icons and manifest
  }
});
