/* Service worker for Bhool Bhulaiyya: The Escape Hunt.
   - The game's own files (page, scripts, styles, icons) are kept in a cache,
     so the installed app opens quickly.
   - When online it always fetches the newest copies first, so updates you
     push to GitHub show up straight away; the cache is only a fallback.
   - /api/ requests (mazes, riddles, scores) always go to the Python server. */
var CACHE = 'bhool-bhulaiyya-v5';
var CORE = ['/', '/css/style.css', '/js/characters.js', '/js/game.js', '/manifest.json',
            '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0) { return; }

  // the page itself: try the network first so it is always up to date
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put('/', copy); });
      return res;
    }).catch(function () { return caches.match('/'); }));
    return;
  }

  // scripts, styles, icons: always try for the newest copy first, so an update
  // pushed to GitHub is used straight away; the cached copy is only a fallback
  event.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
    }
    return res;
  }).catch(function () { return caches.match(req); }));
});
