import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
        layers: {
          radar: false,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.route('https://**/*.{png,jpg,jpeg,webp}', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
});

test('local GeoJSON is session-only, escaped, hideable, and removable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settingsBtn').click();
  await page.locator('#localOverlayFile').setInputFiles({
    name: 'response-area.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name: '<img data-local-xss src=x onerror="window.__localXss=1">', team: 'Alpha' },
        geometry: { type: 'Point', coordinates: [-97, 35] }
      }]
    }))
  });

  await expect(page.locator('#localOverlayStatus')).toContainText('1 feature loaded');
  await expect(page.locator('#map')).toHaveAttribute('data-local-overlay-feature-count', '1');
  await page.locator('#settingsClose').click();
  await page.locator('.leaflet-overlay-pane path').dispatchEvent('click');
  await expect(page.locator('.leaflet-popup-content')).toContainText('<img data-local-xss');
  await expect(page.locator('[data-local-xss]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__localXss || 0)).toBe(0);

  await page.locator('#settingsBtn').click();
  await page.locator('#localOverlayToggleBtn').click();
  await expect(page.locator('#map')).toHaveAttribute('data-local-overlay-visible', 'false');
  await page.locator('#localOverlayToggleBtn').click();
  await expect(page.locator('#map')).toHaveAttribute('data-local-overlay-visible', 'true');
  await page.locator('#localOverlayRemoveBtn').click();
  await expect(page.locator('#map')).toHaveAttribute('data-local-overlay-feature-count', '0');
  await expect(page.locator('#localOverlayToggleBtn')).toBeDisabled();

  const stored = await page.evaluate(() => localStorage.getItem('stormview_settings'));
  expect(stored).not.toContain('response-area');
});

test('local KML loads a bounded placemark and invalid geometry fails safely', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settingsBtn').click();
  await page.locator('#localOverlayFile').setInputFiles({
    name: 'spotter.kml',
    mimeType: 'application/vnd.google-earth.kml+xml',
    buffer: Buffer.from(`<?xml version="1.0"?>
      <kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark>
      <name>Spotter staging</name><Point><coordinates>-97.1,35.4,0</coordinates></Point>
      </Placemark></Document></kml>`)
  });
  await expect(page.locator('#localOverlayStatus')).toContainText('1 feature loaded');
  await expect(page.locator('#map')).toHaveAttribute('data-local-overlay-feature-count', '1');

  await page.locator('#localOverlayFile').setInputFiles({
    name: 'invalid.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(JSON.stringify({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [900, 35] }
    }))
  });
  await expect(page.locator('#localOverlayStatus')).toContainText('outside longitude/latitude bounds');
  await expect(page.locator('#map')).toHaveAttribute('data-local-overlay-feature-count', '1');
});
