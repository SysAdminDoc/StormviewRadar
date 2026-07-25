import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test('diagnostics expose freshness and failures without secrets or coordinates', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'rainviewer',
      radarProduct: 'reflectivity',
      owmKey: 'diagnostic-secret-key',
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
    localStorage.setItem('stormview_bookmarks', JSON.stringify([
      { id: 1, name: 'Private place', lat: 39.1234, lng: -96.5678 }
    ]));
    localStorage.setItem('stormview_welcomed_v5', '1');
  });
  await page.route('https://api.rainviewer.com/public/weather-maps.json', route => route.fulfill({
    status: 503,
    json: { error: 'provider unavailable' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-07-25T20:55:00Z', product: 'N0Q' } }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://nominatim.openstreetmap.org/search**', route => route.fulfill({
    json: [{ lat: '39.1234', lon: '-96.5678', display_name: 'Private place, Test County, TS' }]
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'fallback');
  await page.locator('#searchInput').fill('39.1234,-96.5678');
  await expect(page.locator('.search-item-name')).toHaveText('Private place');

  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="diagnostics"]').click();
  await expect(page.locator('#diagVersion')).toHaveText('0.1.0');
  await expect(page.locator('#diagProvider')).toHaveText('MRMS / reflectivity');
  await expect(page.locator('#diagState')).toContainText('fallback: MRMS fallback: RainViewer failed');
  await expect(page.locator('#diagFreshness')).toContainText('min old');
  await expect(page.locator('#diagCoverage')).toContainText('CONUS');
  await expect(page.locator('#diagResources')).toContainText('1/1 frames');
  await expect(page.locator('#diagRetry')).toContainText('Retry available');
  await expect(page.locator('#diagRequests')).toContainText('api.rainviewer.com/public/weather-maps.json');
  await expect(page.locator('#diagRequests')).not.toContainText('?');

  await page.locator('#copyDiagnosticsBtn').click();
  await expect(page.locator('.toast-msg')).toHaveText('Redacted diagnostics copied');
  const reportText = await page.evaluate(() => navigator.clipboard.readText());
  const report = JSON.parse(reportText);
  expect(report.radar.state).toBe('fallback');
  expect(report.radar.validAt).toBe('2026-07-25T20:55:00.000Z');
  expect(report.requests.some(request => request.status === 503)).toBeTruthy();
  expect(reportText).not.toContain('diagnostic-secret-key');
  expect(reportText).not.toContain('39.1234');
  expect(reportText).not.toContain('-96.5678');
  expect(report.requests.every(request => !request.endpoint.includes('?'))).toBeTruthy();
});
