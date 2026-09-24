/* Battle Learning Platform — Service Worker
 *
 * Strategi:
 *  - Navigasi (HTML): network-first, jatuh ke cache lalu halaman /offline.
 *  - Aset statis Next.js (/_next/static): cache-first (immutable & ber-hash).
 *  - Gambar Pollinations: cache-first (URL deterministik) agar gambar soal
 *    berikutnya sudah siap saat offline/perlahan.
 *  - Ikon & manifest: stale-while-revalidate.
 */

const VERSION = "blp-v1";
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

const PRECACHE = ["/", "/offline", "/manifest.webmanifest"];

const IMAGE_HOSTS = new Set(["image.pollinations.ai"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Batasi jumlah entri di sebuah cache (LRU kasar berdasarkan waktu buat). */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return Response.error();
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.status === 200 || response.type === "opaque")) {
      cache.put(request, response.clone());
      if (maxEntries) void trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jangan pernah meng-cache request dev/HMR atau API internal.
  if (url.pathname.startsWith("/api/")) return;

  // Gambar eksternal (Pollinations).
  if (url.origin !== self.location.origin) {
    if (IMAGE_HOSTS.has(url.hostname)) {
      event.respondWith(cacheFirst(request, IMAGE_CACHE, 80));
    }
    return;
  }

  // Navigasi halaman (HTML).
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // Aset statis Next.js.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Ikon & manifest.
  if (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Sisanya (font, dll.): coba cache lalu jaringan.
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});
