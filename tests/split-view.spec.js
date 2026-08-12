import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function activeAlert() {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'split-warning',
      properties: {
        id: 'split-warning',
        event: 'Severe Thunderstorm Warning',
        severity: 'Severe',
        sent: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-99, 34], [-96, 34], [-96, 37], [-99, 37], [-99, 34]]]
      }
    }]
  };
}

test('two-city view mirrors radar and alerts with a persistent searchable comparison city', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    if (localStorage.getItem('stormview_settings')) return;
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 7,
      settings: {
        source: 'hrrr',
        delay: 1200,
        autoRefresh: false,
        splitView: false,
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
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({ json: activeAlert() }));
  await page.route('https://nominatim.openstreetmap.org/search?**', route => route.fulfill({
    json: [{ lat: '35.4676', lon: '-97.5164', display_name: 'Oklahoma City, Oklahoma, USA' }]
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
  if (await page.locator('#playIcon rect').count()) await page.locator('#playBtn').click();

  await page.locator('#splitViewBtn').click();
  await expect(page.locator('body')).toHaveClass(/split-view/);
  await expect(page.locator('#compareMapPane')).toBeVisible();
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(1);
  await expect(page.locator('#compareMap canvas.leaflet-zoom-animated')).toHaveCount(1);
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-source', 'hrrr');

  const priorFrame = await page.locator('#compareMap').getAttribute('data-radar-frame');
  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('#compareMap')).not.toHaveAttribute('data-radar-frame', priorFrame);

  await page.locator('#compareSearchInput').fill('Oklahoma City');
  await expect(page.locator('.compare-search-result')).toHaveCount(1);
  await page.locator('.compare-search-result').click();
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return {
      schemaVersion: stored.schemaVersion,
      enabled: stored.settings.splitView,
      name: stored.settings.compareLocation.name,
      latitude: Math.round(stored.settings.compareLocation.latitude * 100) / 100
    };
  })).toEqual({ schemaVersion: 7, enabled: true, name: 'Oklahoma City, Oklahoma', latitude: 35.47 });
  const desktopControls = await page.evaluate(() => ({
    top: document.querySelector('.compare-map-controls').getBoundingClientRect().top,
    toolbarBottom: document.getElementById('quickToolbar').getBoundingClientRect().bottom
  }));
  expect(desktopControls.top).toBeGreaterThan(desktopControls.toolbarBottom);

  await page.locator('#compareMapClose').click();
  await expect(page.locator('#compareMapPane')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/split-view/);
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(0);

  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#splitViewBtn').click();
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  const layout = await page.evaluate(() => {
    const primary = document.getElementById('map').getBoundingClientRect();
    const comparison = document.getElementById('compareMapPane').getBoundingClientRect();
    const close = document.getElementById('compareMapClose').getBoundingClientRect();
    return {
      primaryBottom: primary.bottom,
      comparisonTop: comparison.top,
      width: comparison.width,
      closeRight: close.right,
      viewportWidth: window.innerWidth
    };
  });
  expect(Math.abs(layout.primaryBottom - layout.comparisonTop)).toBeLessThanOrEqual(3);
  expect(layout.width).toBe(390);
  expect(layout.closeRight).toBeLessThan(layout.viewportWidth);
});
