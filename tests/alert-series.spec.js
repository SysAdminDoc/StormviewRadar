import { expect, test } from '@playwright/test';

function alertFeature(id, overrides = {}) {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      event: 'Tornado Warning',
      severity: 'Extreme',
      headline: 'Original tornado warning',
      description: 'Take shelter now.',
      areaDesc: 'Test County',
      sent: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      messageType: 'Alert',
      ...overrides
    },
    geometry: null
  };
}

test('CAP updates share one series and zone-only alerts use cached map geometry', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
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
  });

  const zoneUrl = 'https://api.weather.gov/zones/forecast/OKZ025';
  let zoneRequests = 0;
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [
        alertFeature('cap-original', { affectedZones: [zoneUrl] }),
        alertFeature('cap-update', {
          headline: 'Updated tornado warning',
          sent: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          messageType: 'Update',
          references: [{ identifier: 'cap-original' }],
          affectedZones: [zoneUrl]
        }),
        alertFeature('unmapped-advisory', {
          event: 'Flood Advisory',
          severity: 'Minor',
          headline: 'Flood advisory without provider geometry',
          areaDesc: 'Unresolved Test County'
        })
      ]
    }
  }));
  await page.route(zoneUrl, route => {
    zoneRequests += 1;
    return route.fulfill({
      contentType: 'application/geo+json',
      json: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-99, 37], [-93, 37], [-93, 41], [-99, 41], [-99, 37]]]
        }
      }
    });
  });

  await page.goto('/');
  const alertControl = page.locator('.sidebar [data-layer="alerts"]');
  await expect(alertControl).toHaveAttribute('data-feature-count', '2');
  await expect(page.locator('#qtAlertCount')).toHaveText('2');
  await expect(page.locator('#mobileAlertHeadline')).toHaveText('Updated tornado warning');
  await expect(page.locator('#nonMapAlerts')).toBeVisible();
  await expect(page.locator('#nonMapAlertsSummary')).toContainText('1 active alert');
  await expect(page.locator('#nonMapAlertsList')).toContainText('Flood Advisory — Unresolved Test County');
  expect(zoneRequests).toBe(1);

  await alertControl.evaluate(element => element.click());
  await expect(page.locator('#qtAlertCount')).toHaveText('');
  await expect(page.locator('#nonMapAlerts')).toBeHidden();
  await alertControl.evaluate(element => element.click());
  await expect(alertControl).toHaveAttribute('data-feature-count', '2');
  expect(zoneRequests).toBe(1);
});
