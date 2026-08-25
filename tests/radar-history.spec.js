import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function configureMrms(page, reducedData = false) {
  await page.addInitScript(value => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'mrms',
        radarProduct: 'reflectivity',
        preloadWindow: 1,
        reducedData: value,
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
  }, reducedData);
}

async function mockMrms(page, archiveRequests) {
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-08-12T18:00:00Z', product: 'N0Q' } }
  }));
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => {
    const url = route.request().url();
    archiveRequests.set(url, (archiveRequests.get(url) || 0) + 1);
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/png',
      body: transparentPng
    });
  });
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));
}

test('MRMS timeline scrubs six cached hours without mounting the full archive', async ({ page }) => {
  const archiveRequests = new Map();
  await configureMrms(page);
  await mockMrms(page, archiveRequests);

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('MRMS: current');
  await expect(page.locator('#playback')).toBeVisible();
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuemax', '73');
  await expect(page.locator('#map')).toHaveAttribute('data-radar-history-hours', '6');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-08-12T18:00:00.000Z');
  await expect(page.locator('#timelineTicks')).toContainText('−6h');
  await expect(page.locator('#timelineTicks')).toContainText('Now');
  await expect.poll(() => archiveRequests.size).toBe(2);
  await expect(page.locator('.radar-history-frame')).toHaveCount(0);

  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('Home');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-08-12T12:00:00.000Z');
  await expect(page.locator('.radar-history-frame')).toHaveCount(1);
  await expect.poll(() => archiveRequests.size).toBe(3);

  const oldestUrl = 'https://mesonet.agron.iastate.edu/archive/data/2026/08/12/GIS/uscomp/n0q_202608121200.png';
  expect(archiveRequests.get(oldestUrl)).toBe(1);
  await page.locator('#timeline').press('End');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-08-12T18:00:00.000Z');
  await page.locator('#timeline').press('Home');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-08-12T12:00:00.000Z');
  expect(archiveRequests.get(oldestUrl)).toBe(1);
  await expect(page.locator('.radar-history-frame')).toHaveCount(1);
});

test('Reduced Data limits the same history slider to one hour', async ({ page }) => {
  const archiveRequests = new Map();
  await configureMrms(page, true);
  await mockMrms(page, archiveRequests);

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('MRMS: current');
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuemax', '13');
  await expect(page.locator('#map')).toHaveAttribute('data-radar-history-hours', '1');
  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('Home');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-08-12T17:00:00.000Z');
  expect(archiveRequests.size).toBeLessThanOrEqual(3);
});
