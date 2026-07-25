import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function prepareApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      basemap: 'satellite',
      autoRefresh: false,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        states: false,
        counties: false,
        labels: false
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
}

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test('active map providers and bundled identity assets remain visible', async ({ page }) => {
  await page.goto('/');

  const attribution = page.locator('.leaflet-control-attribution');
  await expect(attribution).toBeVisible();
  await expect(attribution).toContainText('Esri');
  await expect(attribution).toContainText('Iowa Environmental Mesonet');
  await expect(page.locator('.data-credit a[href="https://www.rainviewer.com/"]')).toBeVisible();
  await expect(page.locator('.data-credit a[href="https://www.weather.gov/"]')).toBeVisible();
  await expect(page.locator('img[src*="raw.githubusercontent.com"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'logo/StormView-512x512.png');
});

test('Nominatim search is identified and serialized to one request per second', async ({ page }) => {
  const requests = [];
  await page.route('https://nominatim.openstreetmap.org/search**', route => {
    requests.push({ at: Date.now(), url: new URL(route.request().url()) });
    return route.fulfill({
      json: [{ lat: '39', lon: '-96', display_name: `Result ${requests.length}, Test County, TS` }]
    });
  });

  await page.goto('/');
  await page.locator('#searchInput').fill('first');
  await expect(page.locator('.search-item-name')).toHaveText('Result 1');
  await page.locator('#searchInput').fill('second');
  await expect(page.locator('.search-item-name')).toHaveText('Result 2');

  expect(requests).toHaveLength(2);
  expect(requests[1].at - requests[0].at).toBeGreaterThanOrEqual(900);
  expect(requests[1].url.searchParams.get('format')).toBe('jsonv2');
  expect(requests[1].url.searchParams.get('limit')).toBe('5');
  expect(requests[1].url.searchParams.get('email')).toBe('matt_parker@outlook.com');
});

test('runtime assets are local and CSP blocks an unapproved connection origin', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', 'vendor/leaflet/leaflet.css');
  await expect(page.locator('script[src="vendor/leaflet/leaflet.js"]')).toHaveCount(1);
  await expect(page.locator('script[src="vendor/topojson/topojson-client.min.js"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => typeof window.L === 'object' && typeof window.topojson === 'object')).toBe(true);

  const unapprovedRequestSucceeded = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/stormview-csp-probe');
      return true;
    } catch {
      return false;
    }
  });
  expect(unapprovedRequestSucceeded).toBe(false);
});
