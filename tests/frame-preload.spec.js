import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test('preload window persists, mounts both sides, and honors Reduced Data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 6,
      settings: {
        source: 'hrrr',
        delay: 1200,
        preloadWindow: 1,
        loop: true,
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 600 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#map')).toHaveAttribute('data-preload-window', '1');
  await expect(page.locator('#map')).toHaveAttribute('data-preloaded-frames', '3');
  if (await page.locator('#playIcon rect').count()) await page.locator('#playBtn').click();

  await page.locator('#settingsBtn').click();
  await page.locator('#settingsTabRadar').click();
  await page.locator('#preloadWindowSlider').fill('3');
  await expect(page.locator('#preloadWindowValue')).toHaveText('±3');
  await expect(page.locator('#map')).toHaveAttribute('data-preload-window', '3');
  await expect(page.locator('#map')).toHaveAttribute('data-preloaded-frames', '7');

  await page.locator('#settingsTabDisplay').click();
  await page.locator('#reducedDataToggle').click();
  await expect(page.locator('#map')).toHaveAttribute('data-preload-window', '2');
  await expect(page.locator('#map')).toHaveAttribute('data-preloaded-frames', '5');
  await page.locator('#settingsTabRadar').click();
  await expect(page.locator('#preloadWindowSlider')).toHaveValue('3');
  await expect(page.locator('#preloadWindowValue')).toHaveText('±2 cap');
  await expect(page.locator('#preloadWindowSlider')).toHaveAttribute('aria-valuetext', '2 frames each side · Reduced Data cap');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_settings')));
  expect(stored.schemaVersion).toBe(7);
  expect(stored.settings.preloadWindow).toBe(3);
  expect(stored.settings.reducedData).toBe(true);
});
