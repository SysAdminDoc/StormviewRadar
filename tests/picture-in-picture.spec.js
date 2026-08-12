import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function alertsPayload() {
  const now = Date.now();
  const properties = index => ({
    id: `pip-alert-${index}`,
    event: index ? 'Flood Advisory' : 'Severe Thunderstorm Warning',
    severity: index ? 'Moderate' : 'Severe',
    areaDesc: `Test alert area ${index + 1}`,
    sent: new Date(now - 5 * 60 * 1000).toISOString(),
    expires: new Date(now + 60 * 60 * 1000).toISOString()
  });
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'pip-alert-0',
        properties: properties(0),
        geometry: {
          type: 'Polygon',
          coordinates: [[[-99, 34], [-96, 34], [-96, 37], [-99, 37], [-99, 34]]]
        }
      },
      ...Array.from({ length: 24 }, (_, offset) => ({
        type: 'Feature',
        id: `pip-alert-${offset + 1}`,
        properties: properties(offset + 1),
        geometry: null
      }))
    ]
  };
}

test('mini radar mirrors live layers, persists, and stays fixed while alerts scroll', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    if (localStorage.getItem('stormview_settings')) return;
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 8,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        delay: 1200,
        autoRefresh: false,
        pipRadar: false,
        layers: {
          radar: true,
          alerts: true,
          spcOutlook: false,
          stormReports: false,
          couplets: false,
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
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({ json: alertsPayload() }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#nonMapAlertsList li')).toHaveCount(21);
  if (await page.locator('#playIcon rect').count()) await page.locator('#playBtn').click();

  await page.locator('#pipRadarBtn').click();
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
  await expect(page.locator('#pipMap .pip-radar-layer')).toHaveCount(1);
  await expect(page.locator('#pipMap canvas.leaflet-zoom-animated')).toHaveCount(1);
  await expect(page.locator('#pipMap')).toHaveAttribute('data-radar-source', 'hrrr');
  await expect(page.locator('#pipMap')).toHaveAttribute('data-alert-features', '1');

  const priorFrame = await page.locator('#pipMap').getAttribute('data-radar-frame');
  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('#pipMap')).not.toHaveAttribute('data-radar-frame', priorFrame);
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return { schemaVersion: stored.schemaVersion, enabled: stored.settings.pipRadar };
  })).toEqual({ schemaVersion: 9, enabled: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
  await page.locator('#nonMapAlertsSummary').click();
  const initialTop = await page.locator('#pipRadarPanel').evaluate(element => element.getBoundingClientRect().top);
  await page.locator('#nonMapAlerts').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => page.locator('#nonMapAlerts').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const mobileLayout = await page.evaluate(() => {
    const alerts = document.getElementById('nonMapAlerts').getBoundingClientRect();
    const pip = document.getElementById('pipRadarPanel').getBoundingClientRect();
    return {
      alertBottom: alerts.bottom,
      pipTop: pip.top,
      pipRight: pip.right,
      viewportWidth: window.innerWidth
    };
  });
  expect(mobileLayout.pipTop).toBe(initialTop);
  expect(mobileLayout.alertBottom).toBeLessThan(mobileLayout.pipTop);
  expect(mobileLayout.pipRight).toBeLessThanOrEqual(mobileLayout.viewportWidth);

  await page.locator('#pipRadarClose').click();
  await expect(page.locator('#pipRadarPanel')).toBeHidden();
  await expect(page.locator('#pipMap .leaflet-pane')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return stored.settings.pipRadar;
  })).toBe(false);
});
