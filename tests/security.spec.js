import { expect, test } from '@playwright/test';

const hostile = '<img data-xss="provider" src="x" onerror="window.__stormviewXss=1">';
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ hostileValue }) => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: hostileValue,
      opacity: 999,
      layers: {
        radar: true,
        alerts: true,
        spcOutlook: false,
        states: false,
        counties: false,
        labels: false
      }
    }));
    localStorage.setItem('stormview_bookmarks', JSON.stringify([
      { id: 1, name: hostileValue, lat: 39, lng: -96 }
    ]));
  }, { hostileValue: hostile });

  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://api.weather.gov/alerts/active**', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          event: hostile,
          headline: hostile,
          description: hostile,
          expires: '2026-07-26T00:00:00Z'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-97, 38], [-95, 38], [-95, 40], [-97, 40], [-97, 38]]]
        }
      }]
    }
  }));
});

test('hostile provider, bookmark, and search strings render only as text', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/search**', route => route.fulfill({
    json: [{ lat: '39', lon: '-96', display_name: `${hostile}, Test County, TS` }]
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await expect(page.locator('.sidebar .source-tab.active')).toHaveText('HRRR');

  await page.locator('#bookmarksBtn').click();
  await expect(page.locator('.bm-item-name')).toHaveText(hostile);

  await page.locator('#searchInput').fill('test');
  await expect(page.locator('.search-item-name')).toHaveText(hostile);

  await page.locator('#map').click({ position: { x: 640, y: 400 } });
  await expect(page.locator('.leaflet-popup-content')).toContainText(hostile);

  await expect(page.locator('[data-xss]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__stormviewXss || 0)).toBe(0);
});

test('oversized and unknown settings are rejected without breaking startup', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', 'x'.repeat(40000));
  });
  await page.goto('/');
  await expect(page.locator('#map .leaflet-container, #map.leaflet-container')).toHaveCount(1);
  await expect(page.locator('.sidebar .source-tab.active')).toHaveText('HRRR');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
});
