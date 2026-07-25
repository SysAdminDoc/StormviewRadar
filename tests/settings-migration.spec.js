import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      basemap: 'topo',
      theme: 'light',
      owmKey: 'secret-owm-value',
      waqiKey: 'secret-waqi-value',
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
    localStorage.setItem('stormview_welcomed_v5', '1');
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-07-25T12:00:00Z',
      forecast_minute: 120,
      model_forecast_utc: '2026-07-25T14:00:00Z'
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
});

test('legacy settings migrate once into the versioned schema', async ({ page }) => {
  await page.goto('/');
  const storage = await page.evaluate(() => ({
    current: JSON.parse(localStorage.getItem('stormview_settings')),
    legacy: localStorage.getItem('stormview_pro_v3')
  }));

  expect(storage.current.schemaVersion).toBe(1);
  expect(storage.current.settings.basemap).toBe('terrain');
  expect(storage.current.settings.theme).toBe('light');
  expect(storage.current.settings.owmKey).toBe('secret-owm-value');
  expect(storage.legacy).toBeNull();
  await expect(page.locator('.sidebar [data-basemap="terrain"]')).toHaveClass(/active/);
});

test('settings export is versioned and excludes API keys', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settingsBtn').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  expect(download.suggestedFilename()).toBe('stormview-settings.json');
  expect(payload.schemaVersion).toBe(1);
  expect(payload.secretsOmitted).toEqual(['owmKey', 'waqiKey']);
  expect(payload.settings).not.toHaveProperty('owmKey');
  expect(payload.settings).not.toHaveProperty('waqiKey');
  expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('future imports and browser quota failures are visible and recoverable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#importFile').setInputFiles({
    name: 'future-settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 999, settings: {} }))
  });
  await expect(page.locator('.toast').last()).toContainText('supports 1');

  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.locator('#themeBtn').click();
  await expect(page.locator('.toast').last()).toContainText('Settings could not be saved');
  await expect(page.locator('#map')).toBeVisible();
});
