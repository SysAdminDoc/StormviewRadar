import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 5,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));
});

test('persistent tile cache serves a reload without repeating basemap requests', async ({ page }) => {
  let basemapRequests = 0;
  await page.route('https://*.basemaps.cartocdn.com/**', route => {
    basemapRequests += 1;
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/png',
      body: transparentPng
    });
  });

  await page.goto('/');
  await expect.poll(() => basemapRequests).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => {
    const { IndexedDbTileCache } = await import('/src/tile-cache.js');
    return (await new IndexedDbTileCache().snapshot()).count;
  })).toBeGreaterThan(0);

  const firstLoadRequests = basemapRequests;
  await page.reload();
  await expect(page.locator('.leaflet-tile-loaded')).not.toHaveCount(0);
  await page.waitForTimeout(500);
  expect(basemapRequests).toBe(firstLoadRequests);
  await expect(page.locator('#tileStatus')).toHaveAttribute('data-cache-hits', /[1-9]\d*/);
});

test('LRU eviction keeps recently read tiles within the configured bound', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { IndexedDbTileCache } = await import('/src/tile-cache.js');
    let clock = 100;
    const databaseName = `stormview-lru-test-${Date.now()}`;
    const cache = new IndexedDbTileCache({
      databaseName,
      maxEntries: 2,
      maxBytes: 1024,
      now: () => ++clock
    });
    const blob = value => new Blob([value], { type: 'image/png' });
    const urls = {
      first: 'https://tiles.example.test/first.png',
      second: 'https://tiles.example.test/second.png',
      third: 'https://tiles.example.test/third.png'
    };
    await cache.put(urls.first, blob('first'));
    await cache.put(urls.second, blob('second'));
    await cache.get(urls.first);
    await cache.put(urls.third, blob('third'));
    const snapshot = await cache.snapshot();
    const values = {
      first: Boolean(await cache.get(urls.first)),
      second: Boolean(await cache.get(urls.second)),
      third: Boolean(await cache.get(urls.third))
    };
    await cache.close();
    indexedDB.deleteDatabase(databaseName);
    return { snapshot, values };
  });

  expect(result.snapshot.count).toBe(2);
  expect(result.values).toEqual({ first: true, second: false, third: true });
});
