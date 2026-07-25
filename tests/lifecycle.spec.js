import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      autoRefresh: false,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        stormReports: false,
        lightning: false,
        riverGauges: false,
        surfaceObs: false,
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
});

test('repeated lightning toggles retain exactly one tile resource set', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('[data-layer="lightning"]').first();
  const lightningLayers = page.locator('.leaflet-layer:has(img[src*="q2-ltg"])');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await toggle.evaluate(element => element.click());
    await expect(lightningLayers).toHaveCount(1);
    await toggle.evaluate(element => element.click());
    await expect(lightningLayers).toHaveCount(0);
  }
});

test('river gauges use the visible bbox and enforce the marker budget', async ({ page }) => {
  let requestUrl;
  await page.route('https://waterservices.usgs.gov/nwis/iv/**', route => {
    requestUrl = new URL(route.request().url());
    const [west, south, east, north] = requestUrl.searchParams.get('bBox').split(',').map(Number);
    const timeSeries = Array.from({ length: 300 }, (_, index) => {
      const row = Math.floor(index / 20);
      const column = index % 20;
      return {
        sourceInfo: {
          siteName: `Gauge ${index}`,
          geoLocation: {
            geogLocation: {
              latitude: south + ((north - south) * (row + 0.5) / 15),
              longitude: west + ((east - west) * (column + 0.5) / 20)
            }
          }
        },
        values: [{ value: [{ value: String(index) }] }]
      };
    });
    return route.fulfill({ json: { value: { timeSeries } } });
  });

  await page.goto('/');
  const toggle = page.locator('[data-layer="riverGauges"]').first();
  await toggle.evaluate(element => element.click());
  await expect(toggle).toHaveClass(/active/);
  await expect.poll(() => requestUrl?.searchParams.get('bBox')).toBeTruthy();
  expect(requestUrl.searchParams.get('bBox')).not.toBe('-125.0000,24.0000,-66.0000,50.0000');

  await expect.poll(async () => Number(await toggle.getAttribute('data-feature-count'))).toBeGreaterThan(0);
  expect(Number(await toggle.getAttribute('data-feature-count'))).toBeLessThanOrEqual(250);

  await toggle.evaluate(element => element.click());
  await expect(toggle).toHaveAttribute('data-feature-count', '0');
});
