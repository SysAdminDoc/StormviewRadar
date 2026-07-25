import { expect, test } from '@playwright/test';

function polygon(west, south, east, north) {
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south]
    ]]
  };
}

function alertFeature(id, geometry) {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      event: 'Tornado Warning',
      severity: 'Extreme',
      headline: 'A test tornado warning',
      description: 'Take shelter now.',
      areaDesc: 'Test County',
      sent: '2026-07-25T22:00:00Z',
      expires: '2026-07-25T23:00:00Z'
    },
    geometry
  };
}

test('alert audio is opt-in, silent on first load, filtered by distance, and deduplicated', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
        alertAudioEnabled: false,
        layers: {
          radar: false,
          alerts: true,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
    window.__toneStarts = 0;

    class FakeAudioContext {
      state = 'running';
      currentTime = 1;
      destination = {};

      async resume() {}

      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime() {} },
          connect() {},
          start() { window.__toneStarts += 1; },
          stop() {}
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            exponentialRampToValueAtTime() {}
          },
          connect() {}
        };
      }
    }
    window.AudioContext = FakeAudioContext;
  });

  const nearby = polygon(-105, 30, -90, 45);
  const distant = polygon(-76, 39, -74, 41);
  let alertRequests = 0;
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => {
    alertRequests += 1;
    const features = [alertFeature('initial', nearby)];
    if (alertRequests >= 2) features.push(alertFeature('nearby-new', nearby));
    if (alertRequests >= 3) features.push(alertFeature('distant-new', distant));
    return route.fulfill({
      contentType: 'application/geo+json',
      body: JSON.stringify({ type: 'FeatureCollection', features })
    });
  });

  await page.goto('/');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
  expect(await page.evaluate(() => window.__toneStarts)).toBe(0);

  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="alerts"]').click();
  await page.locator('#alertSeveritySelect').selectOption('severe');
  await page.locator('#alertTypeSelect').selectOption('tornado');
  await page.locator('#alertDistanceSelect').selectOption('100');
  await page.locator('#alertAudioToggle').click();
  await expect(page.locator('.toast').last()).toContainText('Alert sounds enabled');
  const confirmationToneStarts = await page.evaluate(() => window.__toneStarts);
  expect(confirmationToneStarts).toBe(2);
  await page.locator('#settingsClose').click();

  const alertToggle = () => page.locator('.sidebar [data-layer="alerts"]').evaluate(element => element.click());
  await alertToggle();
  await alertToggle();
  await expect.poll(() => page.evaluate(() => window.__toneStarts)).toBeGreaterThan(confirmationToneStarts);
  const nearbyToneStarts = await page.evaluate(() => window.__toneStarts);
  await expect(page.locator('.toast').last()).toContainText('1 new matching alert');

  await alertToggle();
  await alertToggle();
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '3');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__toneStarts)).toBe(nearbyToneStarts);
  expect(alertRequests).toBe(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="alerts"]').click();
  await expect(page.locator('#testAlertSoundBtn')).toBeVisible();
  expect(await page.locator('#settingsPanel').evaluate(panel => panel.scrollWidth <= panel.clientWidth)).toBe(true);
});
