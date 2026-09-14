// A version name for this cache. Bump this (v2, v3...) whenever you change
// the app shell files, so browsers pick up the new versions instead of
// serving stale cached copies forever.
const CACHE_NAME = 'artisan-app-shell-v4';

// Every file the app needs just to OPEN -- not product data, just the shell.
// Bumped to v4 and added js/voice_flow.js + js/api.js since the merged
// index.html now loads all four scripts -- remember to bump this every
// time you add a new file to the app shell.
const FILES_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/voice_flow.js',
  './js/offline.js',
  './js/api.js',
  './js/app.js',
  './manifest.json'
  // './icons/icon-192.png',
  // './icons/icon-512.png',
  // './icons/icon-512-maskable.png'
];

// Runs once, the very first time this service worker is installed.
// We download and store every app-shell file in the cache right away.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // activate this new service worker immediately
});

// Runs when a new version of the service worker takes over.
// Deletes any old, outdated cache so you don't pile up stale versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// This is the actual "offline-first" behavior: every time the page asks
// for a file, check the cache FIRST. If it's there, serve it instantly
// (works with zero internet). Only reach out to the network if it's
// not in the cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});