import { expect, test } from '@playwright/test';

const basemapSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#dbeafe"/><path d="M0 64h128M64 0v128" stroke="#64748b" stroke-width="2"/></svg>');
const radarSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="58" fill="#00c800" fill-opacity=".7"/><circle cx="64" cy="64" r="28" fill="#ff6600" fill-opacity=".8"/></svg>');

const persistedRecord = JSON.stringify({
  schemaVersion: 9,
  settings: {
    source: 'rainviewer',
    basemap: 'satellite',
    theme: 'dark',
    visualPalette: 'highContrast',
    language: 'en',
    units: 'us',
    autoRefresh: false,
    splitView: true,
    pipRadar: true,
    layers: { radar: true, alerts: false, states: true, counties: true, labels: true }
  }
});

async function prepareEmbed(page) {
  await page.addInitScript(record => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', record);
  }, persistedRecord);
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: radarSvg
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: basemapSvg
  }));
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: { type: 'FeatureCollection', features: [] }
  }));
}

test.beforeEach(async ({ page }) => {
  await prepareEmbed(page);
});

test('embed URL owns presentation without persisting over viewer settings', async ({ page }) => {
  await page.goto('/?embed=1&lat=41.5868&lon=-93.625&zoom=9&source=hrrr&product=reflectivity'
    + '&basemap=light&layers=radar,alerts&theme=light&palette=colorblind&lang=es&units=metric'
    + '&opacity=.65&controls=0&legend=1&autoplay=0&tz=utc');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('body')).toHaveClass(/embed-mode/);
  await expect(page.locator('body')).not.toHaveClass(/embed-controls/);
  await expect(page.locator('body')).toHaveAttribute('data-visual-palette', 'colorblind');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('#map')).toHaveAttribute('data-latitude', '41.5868');
  await expect(page.locator('#map')).toHaveAttribute('data-longitude', '-93.6250');
  await expect(page.locator('#map')).toHaveAttribute('data-zoom', '9');
  await expect(page.locator('body')).toHaveAttribute('data-embed-layers', 'radar,alerts');
  await expect(page.locator('.sidebar [data-source="hrrr"]')).toHaveClass(/active/);
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveClass(/active/);
  await expect(page.locator('.sidebar [data-layer="states"]')).not.toHaveClass(/active/);

  await expect(page.locator('.header')).toBeHidden();
  await expect(page.locator('.quick-toolbar')).toBeHidden();
  await expect(page.locator('#playback')).toBeHidden();
  await expect(page.locator('#legend')).toBeHidden();
  await expect(page.locator('.leaflet-control-zoom')).toHaveCount(0);
  await expect(page.locator('#embedBrand')).toBeVisible();
  await expect(page.locator('#embedBrand')).toHaveAttribute('aria-label', 'Abrir el mapa completo de StormView Radar');
  await expect(page.locator('#embedBrand')).toHaveAttribute('href', 'http://127.0.0.1:4173/');
  await expect(page.locator('.leaflet-control-attribution')).toBeVisible();
  await expect(page.locator('#playIcon polygon')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('stormview_settings'))).toBe(persistedRecord);
});

test('embed mode renders inside an iframe with optional playback controls', async ({ page, baseURL }) => {
  const embedUrl = `${baseURL}/?embed=1&lat=39&lon=-96&zoom=5&source=hrrr&layers=radar,alerts`
    + '&controls=1&legend=1&autoplay=1';
  await page.setContent(`<iframe title="StormView embed" src="${embedUrl}" style="width:390px;height:480px;border:0"></iframe>`);
  const embed = page.frameLocator('iframe[title="StormView embed"]');
  await expect(embed.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(embed.locator('body')).toHaveClass(/embed-controls/);
  await expect(embed.locator('#embedBrand')).toBeVisible();
  await expect(embed.locator('#playback')).toBeVisible();
  await expect(embed.locator('#legend')).toBeVisible();
  await expect(embed.locator('.leaflet-control-zoom')).toBeVisible();
  await expect(embed.locator('.leaflet-control-attribution')).toBeVisible();
  await expect(embed.locator('#playIcon rect')).toHaveCount(2);
  await expect(embed.locator('.header')).toBeHidden();
  const controlGeometry = await embed.locator('body').evaluate(() => {
    const zoom = document.querySelector('.leaflet-control-zoom').getBoundingClientRect();
    const playback = document.getElementById('playback').getBoundingClientRect();
    return { zoomRight: zoom.right, playbackLeft: playback.left, playbackRight: playback.right, width: innerWidth };
  });
  expect(controlGeometry.zoomRight).toBeLessThanOrEqual(controlGeometry.playbackLeft);
  expect(controlGeometry.playbackRight).toBeLessThanOrEqual(controlGeometry.width);
});
