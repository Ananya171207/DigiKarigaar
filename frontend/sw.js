const CACHE_NAME =
  "artisan-app-shell-v5";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/voice_flow.js",
  "./js/offline.js",
  "./js/api.js",
  "./js/app.js",
  "./manifest.json"
];

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache.addAll(
            FILES_TO_CACHE
          )
        )
        .then(() =>
          self.skipWaiting()
        )
    );
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key !== CACHE_NAME
              )
              .map(
                (key) =>
                  caches.delete(key)
              )
          )
        )
        .then(() =>
          self.clients.claim()
        )
    );
  }
);

self.addEventListener(
  "fetch",
  (event) => {
    const request = event.request;
    const url = new URL(request.url);

    /*
     * Do not intercept POST requests.
     * Do not intercept Flask backend requests.
     */
    if (
      request.method !== "GET" ||
      url.origin !==
        self.location.origin
    ) {
      return;
    }

    event.respondWith(
      caches
        .match(request)
        .then(
          async (cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            try {
              const networkResponse =
                await fetch(request);

              if (
                networkResponse &&
                networkResponse.ok
              ) {
                const cache =
                  await caches.open(
                    CACHE_NAME
                  );

                cache.put(
                  request,
                  networkResponse.clone()
                );
              }

              return networkResponse;

            } catch (error) {
              if (
                request.mode ===
                "navigate"
              ) {
                return (
                  await caches.match(
                    "./index.html"
                  )
                );
              }

              return new Response(
                "This resource is unavailable offline.",
                {
                  status: 503,
                  statusText:
                    "Offline"
                }
              );
            }
          }
        )
    );
  }
);