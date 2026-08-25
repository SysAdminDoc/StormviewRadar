import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function archivedWarning() {
  return {
    type: 'Feature',
    properties: {
      ps: 'Tornado Warning',
      wfo: 'DMX',
      issue: '2024-05-21T20:30:00Z',
      polygon_begin: '2024-05-21T20:30:00Z',
      polygon_end: '2024-05-21T21:00:00Z',
      expire_utc: '2024-05-21T21:00:00Z'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[-94.8, 41.1], [-94.2, 41.1], [-94.2, 41.6], [-94.8, 41.6], [-94.8, 41.1]]]
    }
  };
}

async function prepareTrainingPage(page, { failArchive = false } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        pipRadar: true,
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
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: { type: 'FeatureCollection', features: [] }
  }));
  await page.route('https://mesonet.agron.iastate.edu/geojson/sbw.geojson*', route => {
    if (failArchive) return route.fulfill({ status: 503, body: 'archive unavailable' });
    return route.fulfill({
      contentType: 'application/geo+json',
      body: JSON.stringify({ type: 'FeatureCollection', features: [archivedWarning()] })
    });
  });
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
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
}

test('annotated storm training links archived replay cues and returns to live mode', async ({ page }) => {
  await prepareTrainingPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#pipRadarPanel')).toBeVisible();

  await page.locator('#trainingBtn').click();
  await expect(page.locator('#trainingPanel')).toBeVisible();
  await expect(page.locator('#trainingScenarioSelect option')).toHaveCount(3);
  await expect(page.locator('#trainingDisclosure')).toContainText('Not live');
  await expect(page.locator('#trainingDisclosure')).toContainText('Not an official warning');
  await expect(page.locator('#trainingSummary')).toContainText('Greenfield');
  await page.locator('#trainingLoad').click();

  await expect(page.locator('body')).toHaveClass(/training-mode/);
  await expect(page.locator('#trainingBtn')).toHaveClass(/active/);
  await expect(page.locator('#pipRadarPanel')).toBeHidden();
  await expect(page.locator('#trainingStatus')).toContainText('3 annotated study cues');
  await expect(page.locator('#trainingAnnotations .training-annotation-button')).toHaveCount(3);
  await expect(page.locator('.training-marker-icon')).toHaveCount(1);
  await expect(page.locator('.historical-replay-frame')).toHaveCount(1);
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuemax', '5');
  await expect.poll(() => page.locator('#map').getAttribute('data-latitude').then(Number)).toBeCloseTo(41.31, 2);
  await expect.poll(() => page.locator('#map').getAttribute('data-longitude').then(Number)).toBeCloseTo(-94.52, 2);

  await page.locator('.training-annotation-button').first().click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('Hook-shaped appendage');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Not live');
  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('.training-marker-icon')).toHaveCount(1);
  await expect(page.locator('#timestampText')).toContainText('Replay');

  await page.locator('#trainingExit').click();
  await expect(page.locator('body')).not.toHaveClass(/training-mode/);
  await expect(page.locator('.training-marker-icon')).toHaveCount(0);
  await expect(page.locator('.historical-replay-frame')).toHaveCount(0);
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
  await expect(page.locator('#trainingStatus')).toContainText('Choose an archived example');
});

test('training archive failure preserves live radar and restores suspended views', async ({ page }) => {
  await prepareTrainingPage(page, { failArchive: true });
  await page.goto('/');
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
  await page.locator('#trainingBtn').click();
  await page.locator('#trainingLoad').click();
  await expect(page.locator('#trainingStatus')).toContainText('Training example failed');
  await expect(page.locator('body')).not.toHaveClass(/training-mode/);
  await expect(page.locator('.historical-replay-frame')).toHaveCount(0);
  await expect(page.locator('.radar-layer:not(.historical-replay-frame)').first()).toBeAttached();
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
});
