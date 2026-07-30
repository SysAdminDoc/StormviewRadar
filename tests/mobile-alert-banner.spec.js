import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function alertFeature(id, event, severity, coordinates, sent) {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      event,
      severity,
      sent,
      headline: `${event} for the test area`,
      description: 'Take shelter and monitor official guidance.',
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    }
  };
}

test('mobile alert banner prioritizes visible threats, dismisses, and focuses the map without motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
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
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [
        alertFeature('flood', 'Flood Warning', 'Moderate', [
          [-98, 36], [-96, 36], [-96, 38], [-98, 38], [-98, 36]
        ], '2026-07-25T19:00:00Z'),
        alertFeature('tornado', 'Tornado Warning', 'Extreme', [
          [-99, 38], [-97, 38], [-97, 40], [-99, 40], [-99, 38]
        ], '2026-07-25T18:00:00Z'),
        alertFeature('off-map', 'Tornado Warning', 'Extreme', [
          [10, 10], [11, 10], [11, 11], [10, 11], [10, 10]
        ], '2026-07-25T20:00:00Z')
      ]
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-07-25T18:00:00Z',
      model_forecast_utc: '2026-07-25T19:00:00Z',
      forecast_minute: 60
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  const banner = page.locator('#mobileAlertBanner');
  await expect(banner).toBeVisible();
  await expect(page.locator('#mobileAlertMeta')).toHaveText('2 alert(s) in map');
  await expect(page.locator('#mobileAlertTitle')).toHaveText('Tornado Warning');
  expect(await banner.evaluate(element => parseFloat(getComputedStyle(element).animationDuration))).toBeLessThan(0.001);
  const accessibility = await new AxeBuilder({ page })
    .include('#mobileAlertBanner')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.locator('#mobileAlertDismiss').click();
  await expect(page.locator('#mobileAlertMeta')).toHaveText('1 alert(s) in map');
  await expect(page.locator('#mobileAlertTitle')).toHaveText('Flood Warning');

  await page.locator('#mobileAlertView').click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('Flood Warning');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Take shelter');
});
