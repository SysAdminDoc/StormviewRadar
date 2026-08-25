import { expect, test } from '@playwright/test';

const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const transparentPng = Buffer.from(transparentPngBase64, 'base64');
const metadataUrl = 'https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json';
const alertsUrl = 'https://api.weather.gov/alerts/active?status=actual';

test.use({ serviceWorkers: 'allow' });

function alertCollection() {
  const now = Date.now();
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'offline-warning',
      properties: {
        id: 'offline-warning',
        event: 'Severe Thunderstorm Warning',
        severity: 'Severe',
        headline: 'Cached warning for the test area',
        description: 'Use official guidance.',
        sent: new Date(now - 5 * 60 * 1000).toISOString(),
        expires: new Date(now + 60 * 60 * 1000).toISOString()
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-99, 37], [-96, 37], [-96, 40], [-99, 40], [-99, 37]]]
      }
    }]
  };
}

test('service worker restores the app shell, last radar frame, and alert polygons offline', async ({ context, page }) => {
  const alerts = alertCollection();
  const metadata = { meta: { valid: new Date().toISOString() } };
  const radarUrls = new Set();

  await page.addInitScript(() => {
    const register = ServiceWorkerContainer.prototype.register;
    navigator.serviceWorker.register = () => Promise.reject(new Error('Service worker registration deferred by offline test'));
    window.registerOfflineWorkerForTest = () => register.call(
      navigator.serviceWorker,
      '/service-worker.js',
      { scope: '/' }
    );
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 5,
      settings: {
        source: 'mrms',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: true,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
  });
  await page.route(metadataUrl, route => route.fulfill({ json: metadata }));
  await page.route(alertsUrl, route => route.fulfill({ json: alerts }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => {
    radarUrls.add(route.request().url());
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/png',
      body: transparentPng
    });
  });
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
  await expect.poll(() => radarUrls.size).toBeGreaterThan(0);
  await page.evaluate(() => window.registerOfflineWorkerForTest());
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller))).toBe(true);

  await page.evaluate(async ({ tileUrls, tileBody, metadataRequest, metadataBody, alertRequest, alertBody }) => {
    const names = await caches.keys();
    const shellName = names.find(name => name.startsWith('stormview-shell-'));
    const version = shellName.slice('stormview-shell-'.length);
    const radarCache = await caches.open(`stormview-radar-${version}`);
    const metadataCache = await caches.open(`stormview-radar-meta-${version}`);
    const alertCache = await caches.open(`stormview-alerts-${version}`);
    const bytes = Uint8Array.from(atob(tileBody), character => character.charCodeAt(0));
    await Promise.all(tileUrls.map(url => radarCache.put(
      url,
      new Response(bytes, { headers: { 'Content-Type': 'image/png' } })
    )));
    await metadataCache.put(metadataRequest, new Response(JSON.stringify(metadataBody), {
      headers: { 'Content-Type': 'application/json' }
    }));
    await alertCache.put(alertRequest, new Response(JSON.stringify(alertBody), {
      headers: { 'Content-Type': 'application/geo+json' }
    }));
  }, {
    tileUrls: [...radarUrls],
    tileBody: transparentPngBase64,
    metadataRequest: metadataUrl,
    metadataBody: metadata,
    alertRequest: alertsUrl,
    alertBody: alerts
  });

  await page.evaluate(() => fetch('/index.html?appid=must-not-be-cached'));
  const leakedCredential = await page.evaluate(async () => {
    const keys = (await Promise.all((await caches.keys()).map(async name => (
      (await caches.open(name)).keys()
    )))).flat();
    return keys.some(request => request.url.includes('must-not-be-cached'));
  });
  expect(leakedCredential).toBe(false);

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: async () => {} },
      userChoice: { value: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) }
    });
    window.dispatchEvent(event);
    navigator.serviceWorker.controller.postMessage({ type: 'stormview-mark-offline-radar-frame' });
  });
  await expect(page.locator('#pwaInstallPrompt')).toBeVisible();
  await expect.poll(() => page.locator('#pwaInstallPrompt').getAttribute('data-offline-radar-entries').then(Number)).toBeGreaterThan(0);
  await page.locator('#pwaInstallDismiss').click();
  await expect(page.locator('#pwaInstallPrompt')).toBeHidden();

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#offlineStatus')).toBeVisible();
    await expect(page.locator('#offlineStatus')).toContainText(/Offline|Cached fallback/);
    await expect(page.locator('#offlineStatus')).toContainText('radar');
    await expect(page.locator('#offlineStatus')).toContainText('alerts');
    await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
    await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
    await expect(page.locator('.webgl-tile-canvas[data-rendered-tiles]')).toHaveCount(1);
  } finally {
    await context.setOffline(false);
  }
});
