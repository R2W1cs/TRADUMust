/* TRADUMUST CWASA service worker — cache static assets + SiGML gloss files */
const STATIC_CACHE = "tradumust-cwasa-static-v3";
const SIGML_CACHE = "tradumust-cwasa-sigml-v1";
const REMOTE_SIGML = "https://3dasl-avatar.vercel.app/sigml/";

const PRECACHE = [
  "/asl-avatar/cwa/allcsa.js",
  "/asl-avatar/cwa/cwasa.css",
  "/asl-avatar/cwa/cwacfg.json",
  "/asl-avatar/cwaclientcfg.json",
  "/asl-avatar/cwa/h2s.xsl",
  "/asl-avatar/cwa/shaders/qskin.vert",
  "/asl-avatar/cwa/shaders/qskin.frag",
  "/asl-avatar/avatars/COMMON.jar",
  "/asl-avatar/avatars/anna.jar",
  "/asl-avatar/avatars/marc.jar",
  "/asl-avatar/avatars/francoise.jar",
  "/asl-avatar/gloss-index.json",
  "/asl-avatar/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== SIGML_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || network || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname === "/asl-avatar/gloss-index.json") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/asl-avatar/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.href.startsWith(REMOTE_SIGML)) {
    event.respondWith(staleWhileRevalidate(request, SIGML_CACHE));
  }
});
