import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test('satellite enhancements load GeoColor and fully dispose multi-layer IR sandwich tiles', async ({ page }) => {
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
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.route(/^https:\/\/satellitemaps\.nesdis\.noaa\.gov\/.*/, route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  const toggle = layer => page.locator(`.sidebar [data-layer="${layer}"]`).evaluate(element => element.click());

  await toggle('satelliteGeoColor');
  await expect(page.locator('.satellite-geocolor')).toHaveCount(1);
  await expect(page.locator('.sidebar [data-layer="satelliteGeoColor"]')).toHaveAttribute('data-feature-count', '1');
  await toggle('satelliteGeoColor');
  await expect(page.locator('.satellite-geocolor')).toHaveCount(0);

  await toggle('satelliteSandwich');
  await expect(page.locator('.satellite-geocolor')).toHaveCount(1);
  await expect(page.locator('.satellite-ir-sandwich')).toHaveCount(1);
  await expect(page.locator('.sidebar [data-layer="satelliteSandwich"]')).toHaveAttribute('data-feature-count', '2');
  await toggle('satelliteSandwich');
  await expect(page.locator('.satellite-geocolor')).toHaveCount(0);
  await expect(page.locator('.satellite-ir-sandwich')).toHaveCount(0);

  await toggle('satelliteWV');
  await expect(page.locator('.satellite-layer-water-vapor')).toHaveCount(1);
  await toggle('satelliteWV');
  await expect(page.locator('.satellite-layer-water-vapor')).toHaveCount(0);

  await toggle('satelliteMesoscale');
  await expect(page.locator('.satellite-mesoscale-1')).toHaveCount(1);
  await expect(page.locator('.satellite-mesoscale-2')).toHaveCount(1);
  await expect(page.locator('.sidebar [data-layer="satelliteMesoscale"]')).toHaveAttribute('data-feature-count', '2');
  await toggle('satelliteMesoscale');
  await expect(page.locator('.satellite-mesoscale')).toHaveCount(0);
});
