import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function warningFeature(start, end) {
  return {
    type: 'Feature',
    id: 'OUN.TO.W.0001',
    properties: {
      ps: 'Tornado Warning',
      phenomena: 'TO',
      significance: 'W',
      wfo: 'OUN',
      issue: start,
      polygon_begin: start,
      polygon_end: end,
      expire_utc: end,
      max_windtag: 70,
      max_hailtag: 1.5,
      max_is_pds: false,
      max_is_emergency: false
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-98, 35],
        [-97, 35],
        [-97, 36],
        [-98, 36],
        [-98, 35]
      ]]
    }
  };
}

test('historical replay synchronizes archived radar frames with warning validity and returns live', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
        layers: {
          radar: false,
          alerts: true,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });

  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: { type: 'FeatureCollection', features: [] }
  }));
  await page.route('https://mesonet.agron.iastate.edu/geojson/sbw.geojson*', route => {
    const url = new URL(route.request().url());
    const start = new Date(url.searchParams.get('sts'));
    const warningStart = new Date(start.getTime() + 5 * 60 * 1000).toISOString();
    const warningEnd = new Date(start.getTime() + 15 * 60 * 1000).toISOString();
    return route.fulfill({
      contentType: 'application/geo+json',
      body: JSON.stringify({
        type: 'FeatureCollection',
        features: [warningFeature(warningStart, warningEnd)]
      })
    });
  });
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-07-25T12:00:00Z',
      model_forecast_utc: '2026-07-25T13:00:00Z',
      forecast_minute: 60
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="radar"]').click();
  await page.locator('#replayStartInput').fill('2024-05-26T15:45');
  await page.locator('#replayEndInput').fill('2024-05-26T16:00');
  await page.locator('#startReplayBtn').click();

  await expect(page.locator('#replayStatus')).toContainText('4 frames · 1 warning polygons');
  await expect(page.locator('.historical-replay-frame')).toHaveCount(1);
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuemax', '4');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '0');
  await page.locator('#settingsClose').click();

  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
  await expect(page.locator('.historical-replay-frame')).toHaveCount(1);
  await expect(page.locator('#timestampText')).toContainText('Replay');
  await page.locator('#stepFwdBtn').click();
  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '0');

  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="radar"]').click();
  await page.locator('#exitReplayBtn').click();
  await expect(page.locator('.historical-replay-frame')).toHaveCount(0);
  await expect(page.locator('#replayStatus')).toHaveText('Live mode');
});
