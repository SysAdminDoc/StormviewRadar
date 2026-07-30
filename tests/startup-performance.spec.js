import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function seed(page, overrides = {}) {
  await page.addInitScript(options => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      delay: 200,
      autoRefresh: false,
      ...options,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        states: false,
        counties: false,
        labels: false,
        ...options.layers
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  }, overrides);
}

async function routeTiles(page) {
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    headers: { 'content-length': String(transparentPng.length) },
    body: transparentPng
  }));
}

test('startup remains loading until radar reaches a terminal state', async ({ page }) => {
  await seed(page);
  await routeTiles(page);
  let releaseMetadata;
  const metadataReady = new Promise(resolve => { releaseMetadata = resolve; });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', async route => {
    await metadataReady;
    await route.fulfill({
      headers: { 'content-length': '128' },
      json: { model_init_utc: '2026-07-25T12:00:00Z', forecast_minute: 120 }
    });
  });

  await page.goto('/');
  await expect(page.locator('#loading')).not.toHaveClass(/hidden/);
  await expect(page.locator('#startupStatus')).toContainText('loading');
  releaseMetadata();

  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#loading')).toHaveClass(/hidden/);
  await expect(page.locator('#loadProgressBar')).toHaveAttribute('role', 'progressbar');
  await expect(page.locator('#loadProgressBar')).toHaveAttribute('aria-valuenow', /\d+/);
});

test('terminal startup failure remains recoverable and retry succeeds', async ({ page }) => {
  await seed(page);
  await routeTiles(page);
  let failing = true;
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => (
    failing
      ? route.fulfill({ status: 503, body: 'unavailable' })
      : route.fulfill({ json: { model_init_utc: '2026-07-25T12:00:00Z', forecast_minute: 60 } })
  ));
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => (
    failing
      ? route.fulfill({ status: 503, body: 'unavailable' })
      : route.fulfill({ json: { meta: { valid: '2026-07-25T14:00:00Z' } } })
  ));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#loadProgress')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#loadProgressRetry')).toBeVisible();

  failing = false;
  await page.locator('#loadProgressRetry').click();
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#loadProgressRetry')).toBeHidden();
});

test('reduced data bounds frames, pauses heavy overlays, and reports performance', async ({ page }) => {
  await seed(page, { reducedData: true, layers: { stormReports: true } });
  await routeTiles(page);
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    headers: { 'content-length': '256' },
    json: { model_init_utc: '2026-07-25T12:00:00Z', forecast_minute: 1080 }
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsTabDiagnostics').click();
  await expect(page.locator('#diagResources')).toContainText('/7 frames');
  await expect(page.locator('#diagResources')).toContainText('7 layers');
  await expect(page.locator('#diagResources')).toContainText(/first frame \d+ ms/);
  await expect(page.locator('#diagResources')).toContainText('bytes');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_settings')).settings);
  expect(stored.layers.stormReports).toBe(false);
});
