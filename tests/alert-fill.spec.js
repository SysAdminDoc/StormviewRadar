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

function alertFeature(id, event, sent, geometry) {
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      event,
      severity: event.includes('Watch') ? 'Severe' : 'Extreme',
      headline: `${event} for test counties`,
      description: 'Use official NWS guidance.',
      sent,
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    },
    geometry
  };
}

test('warning polygons fade by issuance age while retaining hazard borders and cleanup', async ({ page }) => {
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

  const now = Date.now();
  const features = [
    alertFeature('new-warning', 'Tornado Warning', new Date(now - 5 * 60 * 1000).toISOString(), polygon(-125, 24, -96, 50)),
    alertFeature('aging-warning', 'Severe Thunderstorm Warning', new Date(now - 90 * 60 * 1000).toISOString(), polygon(-96, 24, -66, 50))
  ];
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    contentType: 'application/geo+json',
    body: JSON.stringify({ type: 'FeatureCollection', features })
  }));

  await page.goto('/');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '2');
  await expect(page.locator('.alert-age-legend')).toContainText('Warning age');
  await expect(page.locator('.alert-age-legend')).toContainText('Fill fades with time since issue');

  const [newAlpha, agingAlpha] = await page.locator('#map canvas').evaluate(canvas => {
    const context = canvas.getContext('2d');
    const bounds = canvas.getBoundingClientRect();
    const sample = viewportRatio => {
      const viewportX = window.innerWidth * viewportRatio;
      const viewportY = window.innerHeight * 0.5;
      const x = Math.round((viewportX - bounds.left) * canvas.width / bounds.width);
      const y = Math.round((viewportY - bounds.top) * canvas.height / bounds.height);
      return context.getImageData(x, y, 1, 1).data[3];
    };
    return [sample(0.4), sample(0.6)];
  });
  expect(newAlpha).toBeGreaterThan(agingAlpha);
  expect(agingAlpha).toBeGreaterThan(0);

  await page.locator('#map').click({ position: { x: 520, y: 360 } });
  await expect(page.locator('.leaflet-popup-content')).toContainText('Issued:');
  await expect(page.locator('.leaflet-popup-content')).toContainText('since issue');

  await page.locator('.sidebar [data-layer="alerts"]').evaluate(element => element.click());
  await expect(page.locator('.alert-age-legend')).toHaveCount(0);
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '0');
});
