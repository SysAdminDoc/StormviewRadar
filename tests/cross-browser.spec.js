import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test('critical startup, radar, and accessibility smoke', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
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
    localStorage.setItem('stormview_welcomed', '1');
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
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-source', 'hrrr');
  await expect(page.locator('.leaflet-radar-pane img.leaflet-tile').first()).toBeVisible();

  const settings = page.locator('#settingsBtn');
  await settings.focus();
  await settings.press('Enter');
  await expect(page.locator('#settingsPanel')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
  await expect(page.locator('.sidebar [data-layer="radar"]')).toHaveAttribute('role', 'checkbox');
  await expect(page.locator('.sidebar [data-layer="radar"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#searchInput')).toHaveAttribute('role', 'combobox');
  await expect(page.locator('#searchInput')).toHaveAttribute('aria-controls', 'searchResults');
});
