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

function intersects(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

// The first-visit tip is a toast, and the toast container used to be anchored
// at y=80, right on top of the quick toolbar and the alert banner.
for (const [label, width, height] of [['narrow', 390, 844], ['wide', 1440, 900]]) {
  test(`the first-visit tip clears the toolbar and the alert banner on a ${label} viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem('stormview_settings', JSON.stringify({
        schemaVersion: 4,
        settings: {
          source: 'hrrr',
          autoRefresh: false,
          layers: { radar: true, alerts: true, spcOutlook: false, states: false, counties: false, labels: false }
        }
      }));
    });
    await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [alertFeature(
          'tip-overlap',
          'Severe Thunderstorm Warning',
          'Severe',
          [[-97, 38], [-95, 38], [-95, 40], [-97, 40], [-97, 38]],
          new Date().toISOString()
        )]
      }
    }));
    await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
      json: { model_init_utc: '2026-07-25T12:00:00Z', forecast_minute: 120, model_forecast_utc: '2026-07-25T14:00:00Z' }
    }));
    await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
      status: 200, contentType: 'image/png', body: transparentPng
    }));

    await page.goto('/');
    // The tip fires 2.5s after a first visit, so wait for the real toast.
    const toast = page.locator('#toastContainer .toast').first();
    await expect(toast).toBeVisible({ timeout: 15000 });
    await expect(toast).toContainText('Tip:');

    const toastBox = await toast.boundingBox();
    const banner = page.locator('#mobileAlertBanner');
    if (await banner.isVisible()) {
      const bannerBox = await banner.boundingBox();
      expect(intersects(toastBox, bannerBox)).toBe(false);
    }

    const buttons = page.locator('#quickToolbar .qt-btn');
    const count = await buttons.count();
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      expect(intersects(toastBox, await button.boundingBox())).toBe(false);
      // Geometry alone is not proof the control is reachable.
      await expect(button).toBeEnabled();
    }
    await expect(page.locator('#quickToolbar [data-qt="lightning"]')).toHaveAttribute('aria-checked', 'false');
    await page.locator('#quickToolbar [data-qt="lightning"]').click({ timeout: 5000 });
    await expect(page.locator('#quickToolbar [data-qt="lightning"]')).toHaveAttribute('aria-checked', 'true');
  });
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
  await expect(page.locator('#mobileAlertMeta')).toHaveText('2 alerts in map');
  await expect(page.locator('#mobileAlertTitle')).toHaveText('Tornado Warning');
  expect(await banner.evaluate(element => parseFloat(getComputedStyle(element).animationDuration))).toBeLessThan(0.001);
  const accessibility = await new AxeBuilder({ page })
    .include('#mobileAlertBanner')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.locator('#mobileAlertDismiss').click();
  await expect(page.locator('#mobileAlertMeta')).toHaveText('1 alert in map');
  await expect(page.locator('#mobileAlertTitle')).toHaveText('Flood Warning');

  await page.locator('#mobileAlertView').click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('Flood Warning');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Take shelter');
});
