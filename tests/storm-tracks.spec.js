import { expect, test } from '@playwright/test';

function stormFeature(valid, longitude, properties = {}) {
  return {
    type: 'Feature',
    properties: {
      nexrad: 'TLX',
      storm_id: 'A1',
      valid,
      tvs: 'NONE',
      meso: '3',
      posh: 65,
      poh: 80,
      max_size: 1.5,
      vil: 42,
      max_dbz: 58,
      max_dbz_height: 24,
      top: 44,
      drct: 90,
      sknt: 30,
      ...properties
    },
    geometry: { type: 'Point', coordinates: [longitude, 35] }
  };
}

test('storm tracks hydrate observed history and update a projected cell path', async ({ page }) => {
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
          labels: false,
          stormTracks: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });

  let currentRequests = 0;
  await page.route('https://mesonet.agron.iastate.edu/geojson/nexrad_attr.py*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('valid')) {
      const valid = url.searchParams.get('valid');
      return route.fulfill({
        contentType: 'application/geo+json',
        body: JSON.stringify({
          type: 'FeatureCollection',
          generated_at: valid,
          features: [stormFeature(valid, -97.5 + currentRequests * 0.1)]
        })
      });
    }

    currentRequests += 1;
    const valid = currentRequests === 1 ? '2026-07-25T22:00:00Z' : '2026-07-25T22:05:00Z';
    return route.fulfill({
      contentType: 'application/geo+json',
      body: JSON.stringify({
        type: 'FeatureCollection',
        generated_at: valid,
        features: [stormFeature(valid, currentRequests === 1 ? -97 : -96.9)]
      })
    });
  });

  await page.goto('/');
  const toggle = () => page.locator('.sidebar [data-layer="stormTracks"]').evaluate(element => element.click());
  await toggle();

  await expect(page.locator('.storm-cell-marker')).toHaveCount(1);
  await expect(page.locator('.storm-track-history')).toHaveCount(1);
  await expect(page.locator('.storm-track-projection')).toHaveCount(1);
  await expect(page.locator('.storm-track-forecast-point')).toHaveCount(2);
  await expect(page.locator('.sidebar [data-layer="stormTracks"]')).toHaveAttribute('data-feature-count', '1');

  await page.locator('.storm-cell-marker').dispatchEvent('click');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Storm TLX-A1');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Projected path: 30/60 min');
  await expect(page.locator('.leaflet-popup-content')).toContainText('not an official warning');

  await toggle();
  await expect(page.locator('.storm-cell-marker')).toHaveCount(0);
  await toggle();
  await expect(page.locator('.storm-cell-marker')).toHaveCount(1);
  expect(currentRequests).toBe(2);
});
