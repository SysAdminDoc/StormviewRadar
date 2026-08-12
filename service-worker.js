const CACHE_VERSION = '2026-08-12-8';
const SHELL_CACHE = `stormview-shell-${CACHE_VERSION}`;
const RADAR_CACHE = `stormview-radar-${CACHE_VERSION}`;
const RADAR_META_CACHE = `stormview-radar-meta-${CACHE_VERSION}`;
const ALERT_CACHE = `stormview-alerts-${CACHE_VERSION}`;
const CACHE_LIMITS = new Map([
  [RADAR_CACHE, 256],
  [RADAR_META_CACHE, 16],
  [ALERT_CACHE, 8]
]);
const SHELL_PATHS = [
  './',
  './index.html',
  './logo/StormView-16x16.png',
  './logo/StormView-32x32.png',
  './logo/StormView-48x48.png',
  './logo/StormView-96x96.png',
  './logo/StormView-192x192.png',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/topojson/topojson-client.min.js',
  './vendor/cesium/Widgets/widgets.css',
  './src/providers/registry.js',
  './src/i18n.js',
  './src/frame-preload.js',
  './src/picture-in-picture.js',
  './src/split-view.js',
  './src/visual-palette.js',
  './src/map-snapshot.js',
  './src/embed-mode.js',
  './src/chasecaster.js',
  './src/alert-fill.js',
  './src/alert-series.js',
  './src/layer-opacity.js',
  './src/local-overlay.js',
  './src/mobile-alert-banner.js',
  './src/road-events.js',
  './src/tile-cache.js',
  './src/webgl-tile-renderer.js'
];
const SENSITIVE_QUERY_KEYS = new Set(['access_token', 'api_key', 'apikey', 'appid', 'key', 'token']);

function hasSensitiveQuery(url) {
  return [...url.searchParams.keys()].some(key => SENSITIVE_QUERY_KEYS.has(key.toLowerCase()));
}

function hasSensitiveHeaders(request) {
  return request.headers.has('authorization') || request.headers.has('x-api-key');
}

function isRadarImage(request, url) {
  if (url.hostname.endsWith('rainviewer.com')) return true;
  if (url.hostname === 'mesonet.agron.iastate.edu') {
    return url.pathname.includes('/cache/tile.py/') || request.destination === 'image';
  }
  if (url.hostname === 'nowcoast.noaa.gov') {
    return request.destination === 'image'
      || url.searchParams.get('request')?.toLowerCase() === 'getmap';
  }
  return false;
}

function isRadarMetadata(url) {
  return (url.hostname === 'api.rainviewer.com' && url.pathname.endsWith('/public/weather-maps.json'))
    || (url.hostname === 'mesonet.agron.iastate.edu' && url.pathname.endsWith('.json'))
    || (url.hostname === 'nowcoast.noaa.gov'
      && url.pathname.includes('/weather_radar/')
      && url.searchParams.get('request')?.toLowerCase() !== 'getmap');
}

function isAlertRequest(url) {
  return url.hostname === 'api.weather.gov' && url.pathname.startsWith('/alerts/');
}

async function trimCache(name) {
  const limit = CACHE_LIMITS.get(name);
  if (!limit) return;
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(key => cache.delete(key)));
}

async function storeResponse(cacheName, request, response) {
  if (!(response.ok || response.type === 'opaque')) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cacheName);
}

async function notifyFallback(resource) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type: 'stormview-offline-fallback', resource }));
}

async function networkFirst(request, cacheName, resource) {
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    const cached = await caches.match(request, { cacheName });
    if (!cached) throw error;
    await notifyFallback(resource);
    return cached;
  }
  try {
    await storeResponse(cacheName, request, response);
  } catch (error) {
    console.warn(`StormView could not update ${cacheName}:`, error);
  }
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_PATHS.map(path => new Request(path, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const active = new Set([SHELL_CACHE, RADAR_CACHE, RADAR_META_CACHE, ALERT_CACHE]);
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('stormview-') && !active.has(name))
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (hasSensitiveQuery(url) || hasSensitiveHeaders(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cached = await caches.match(new URL('./index.html', self.registration.scope));
        await notifyFallback('shell');
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isAlertRequest(url)) {
    event.respondWith(networkFirst(request, ALERT_CACHE, 'alerts'));
    return;
  }
  if (isRadarMetadata(url)) {
    event.respondWith(networkFirst(request, RADAR_META_CACHE, 'radar'));
    return;
  }
  if (isRadarImage(request, url)) {
    event.respondWith(networkFirst(request, RADAR_CACHE, 'radar'));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return fetch(request);
    })());
  }
});
