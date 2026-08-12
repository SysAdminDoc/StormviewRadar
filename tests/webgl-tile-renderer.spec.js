import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function prepareRadar(page, { disableWebGL = false } = {}) {
  await page.addInitScript(({ withoutWebGL }) => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 5,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
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
    if (withoutWebGL) {
      const nativeGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (type === 'webgl' || type === 'experimental-webgl') return null;
        return nativeGetContext.call(this, type, ...args);
      };
    }
  }, { withoutWebGL: disableWebGL });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-08-12T12:00:00Z',
      forecast_minute: 60
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));
}

test('visible tiled radar uses one linearly filtered WebGL compositor and releases it', async ({ page }) => {
  await prepareRadar(page);
  await page.goto('/');

  const canvas = page.locator('.radar-layer.webgl-active > .webgl-tile-canvas');
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => Number(await canvas.getAttribute('data-rendered-tiles'))).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
  expect(await canvas.evaluate(element => Boolean(element.getContext('webgl')))).toBe(true);
  await expect(page.locator('.radar-layer.webgl-active > .leaflet-tile-container').first()).toHaveCSS('visibility', 'hidden');

  await page.locator('#playBtn').click();
  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('.radar-layer.webgl-active > .webgl-tile-canvas')).toHaveCount(1);

  const radarToggle = page.locator('.sidebar [data-layer="radar"]');
  await radarToggle.evaluate(element => element.click());
  await expect(page.locator('.webgl-tile-canvas')).toHaveCount(0);
  await expect(page.locator('.radar-layer.webgl-active')).toHaveCount(0);
});

test('radar tiles remain visible when WebGL is unavailable', async ({ page }) => {
  await prepareRadar(page, { disableWebGL: true });
  await page.goto('/');

  const radarLayer = page.locator('.radar-layer').first();
  await expect(radarLayer).toHaveAttribute('data-renderer', 'dom');
  await expect(page.locator('.webgl-tile-canvas')).toHaveCount(0);
  await expect(radarLayer.locator('.leaflet-tile-loaded').first()).toBeVisible();
});
