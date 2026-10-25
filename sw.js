const CACHE = 'snake-v3';
const ASSETS = [
    './', './index.html', './style.css', './extra.css', './ui.css',
    './config.js', './game.js', './ui.js', './player.js', './book.js', './input.js', './pwa.js', './popup.js',
    './manifest.webmanifest',
    './icon-32.png', './icon-180.png', './icon-192.png', './icon-512.png',
    './book/emblem.png', './book/paper.png', './book/intro.png', './book/apple.png', './book/gold.png',
    './book/combo.png', './book/speed.png', './book/walls.png', './book/skins.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    if (req.headers.has('range') || url.pathname.includes('/music/')) return;
    e.respondWith(caches.open(CACHE).then(async cache => {
        const cached = await cache.match(req);
        const network = fetch(req).then(resp => {
            if (resp.ok) cache.put(req, resp.clone());
            return resp;
        }).catch(() => null);
        return cached || (await network) || cache.match('./index.html');
    }));
});
