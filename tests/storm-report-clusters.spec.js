import { expect, test } from '@playwright/test';

function reportFeature(id, longitude, latitude, typetext) {
  return {
    type: 'Feature',
    properties: {
      id,
      typetext,
      city: 'Test City',
      state: 'TS',
      magnitude: typetext === 'HAIL' ? '1.50' : '',
      remark: 'Deterministic test report',
      valid: '2026-07-25T22:00:00Z'
    },
    geometry: { type: 'Point', coordinates: [longitude, latitude] }
  };
}

test('storm reports cluster at overview zoom and expand to individual renderers at detail zoom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
          stormReports: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });
  const features = [
    reportFeature('a', -97, 35, 'TORNADO'),
    reportFeature('b', -96.99, 35.01, 'HAIL'),
    reportFeature('c', -96.98, 35.02, 'HAIL'),
    reportFeature('d', -96.97, 35.03, 'TSTM WND GST')
  ];
  await page.route('https://mesonet.agron.iastate.edu/geojson/lsr.geojson?recent=86400', route => route.fulfill({
    contentType: 'application/geo+json',
    body: JSON.stringify({ type: 'FeatureCollection', features })
  }));

  await page.goto('/');
  const toggle = page.locator('.sidebar [data-layer="stormReports"]');
  await toggle.evaluate(element => element.click());
  await expect(toggle).toHaveAttribute('data-feature-count', '4');
  await expect(toggle).toHaveAttribute('data-rendered-count', '1');
  await expect(toggle).toHaveAttribute('data-cluster-count', '1');
  const cluster = page.locator('.storm-report-cluster-icon');
  await expect(cluster).toHaveCount(1);
  await expect(cluster).toContainText('4');
  await expect(cluster).toHaveAttribute('role', 'button');
  await expect(cluster).toHaveAttribute('aria-label', /4 storm reports/);

  await cluster.click();
  await expect(toggle).toHaveAttribute('data-cluster-count', '1');
  await cluster.click();
  await expect(toggle).toHaveAttribute('data-rendered-count', '4');
  await expect(toggle).toHaveAttribute('data-cluster-count', '0');
  await expect(cluster).toHaveCount(0);

  await toggle.evaluate(element => element.click());
  await expect(toggle).toHaveAttribute('data-feature-count', '0');
  await expect(toggle).toHaveAttribute('data-rendered-count', '0');
});
