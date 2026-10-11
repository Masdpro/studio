/* Closebuy image cache — stale-while-revalidate.
 * Cached images are served instantly; in the same moment the browser asks the
 * network for a fresh copy, stores it, and tells open pages if it changed.
 * Only public product/market images are cached — never private documents or API data. */
const CACHE = 'closebuy-images-v1';
const MAX_ENTRIES = 400;
const SAME_ORIGIN_PUBLIC = [/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/, /^\/_next\/image/, /^\/products\//, /^\/markets\//, /^\/logo/];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('closebuy-images-') && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});

function cacheable(request) {
  if (request.method !== 'GET' || request.destination !== 'image') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return url.protocol === 'https:';
  return SAME_ORIGIN_PUBLIC.some((re) => re.test(url.pathname));
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
}

function signature(res) {
  return res.headers.get('etag') || res.headers.get('last-modified') || res.headers.get('content-length') || '';
}

async function revalidate(request, cache, cached) {
  try {
    const fresh = await fetch(request);
    if (fresh && (fresh.ok || fresh.type === 'opaque')) {
      await cache.put(request, fresh.clone());
      trim(cache);
      if (cached && fresh.ok && signature(cached) !== signature(fresh)) {
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: 'image-updated', url: request.url }));
      }
    }
    return fresh;
  } catch {
    return undefined;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!cacheable(request)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const refresh = revalidate(request, cache, cached);
      if (cached) {
        event.waitUntil(refresh); // keep the worker alive until the background refresh lands
        return cached;
      }
      return (await refresh) || Response.error();
    })()
  );
});
