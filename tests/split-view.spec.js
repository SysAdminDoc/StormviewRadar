import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function activeAlert() {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'split-warning',
      properties: {
        id: 'split-warning',
        event: 'Severe Thunderstorm Warning',
        severity: 'Severe',
        sent: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-99, 34], [-96, 34], [-96, 37], [-99, 37], [-99, 34]]]
      }
    }]
  };
}

test('two-city view mirrors radar and alerts with a persistent searchable comparison city', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    if (localStorage.getItem('stormview_settings')) return;
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 7,
      settings: {
        source: 'hrrr',
        delay: 1200,
        autoRefresh: false,
        splitView: false,
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
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
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
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({ json: activeAlert() }));
  await page.route('https://nominatim.openstreetmap.org/search?**', route => route.fulfill({
    json: [{ lat: '35.4676', lon: '-97.5164', display_name: 'Oklahoma City, Oklahoma, USA' }]
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
  if (await page.locator('#playIcon rect').count()) await page.locator('#playBtn').click();

  await page.locator('#splitViewBtn').click();
  await expect(page.locator('body')).toHaveClass(/split-view/);
  await expect(page.locator('#compareMapPane')).toBeVisible();
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(1);
  await expect(page.locator('#compareMap canvas.leaflet-zoom-animated')).toHaveCount(1);
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-source', 'hrrr');

  const priorFrame = await page.locator('#compareMap').getAttribute('data-radar-frame');
  await page.locator('#stepFwdBtn').click();
  await expect(page.locator('#compareMap')).not.toHaveAttribute('data-radar-frame', priorFrame);

  await page.locator('#compareSearchInput').fill('Oklahoma City');
  await expect(page.locator('.compare-search-result')).toHaveCount(1);
  await page.locator('.compare-search-result').click();
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return {
      schemaVersion: stored.schemaVersion,
      enabled: stored.settings.splitView,
      name: stored.settings.compareLocation.name,
      latitude: Math.round(stored.settings.compareLocation.latitude * 100) / 100
    };
  })).toEqual({ schemaVersion: 9, enabled: true, name: 'Oklahoma City, Oklahoma', latitude: 35.47 });
  const desktopControls = await page.evaluate(() => ({
    top: document.querySelector('.compare-map-controls').getBoundingClientRect().top,
    toolbarBottom: document.getElementById('quickToolbar').getBoundingClientRect().bottom
  }));
  expect(desktopControls.top).toBeGreaterThan(desktopControls.toolbarBottom);

  await page.locator('#compareMapClose').click();
  await expect(page.locator('#compareMapPane')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/split-view/);
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(0);

  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#splitViewBtn').click();
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  const layout = await page.evaluate(() => {
    const primary = document.getElementById('map').getBoundingClientRect();
    const comparison = document.getElementById('compareMapPane').getBoundingClientRect();
    const close = document.getElementById('compareMapClose').getBoundingClientRect();
    return {
      primaryBottom: primary.bottom,
      comparisonTop: comparison.top,
      width: comparison.width,
      closeRight: close.right,
      viewportWidth: window.innerWidth
    };
  });
  expect(Math.abs(layout.primaryBottom - layout.comparisonTop)).toBeLessThanOrEqual(3);
  expect(layout.width).toBe(390);
  expect(layout.closeRight).toBeLessThan(layout.viewportWidth);
});

test('the comparison pane can carry a second radar product locked to the primary view', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    if (localStorage.getItem('stormview_settings')) return;
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'mrms',
        radarProduct: 'reflectivity',
        preloadWindow: 1,
        autoRefresh: false,
        splitView: false,
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
  });

  const tiles = [];
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-08-12T18:00:00Z', product: 'N0Q' } }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => {
    tiles.push(route.request().url());
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/png',
      body: transparentPng
    });
  });
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://nominatim.openstreetmap.org/search?**', route => route.fulfill({
    json: [{ lat: '35.4676', lon: '-97.5164', display_name: 'Oklahoma City, Oklahoma, USA' }]
  }));

  const productTiles = product => new Set(tiles
    .filter(url => url.includes(`nexrad-${product}-900913`))
    .map(url => url.split('900913/')[1]));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');

  // Park the comparison pane over another city first, so the product lock has
  // a different view to pull back rather than one that already agrees.
  await page.locator('#splitViewBtn').click();
  await page.locator('#compareSearchInput').fill('Oklahoma City');
  await page.locator('.compare-search-result').click();
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');

  const select = page.locator('#compareProductSelect');
  await expect(select).toBeVisible();
  await expect(select.locator('option')).toHaveText(['Same product', 'Velocity', 'Echo Tops', 'Precipitation']);

  await select.selectOption('velocity');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');
  await expect(page.locator('#compareMapTitle')).toHaveText('Velocity comparison');
  await expect(page.locator('#compareSearchInput')).toBeDisabled();
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(1);
  await expect(page.locator('#map .radar-layer')).toHaveCount(1);

  // Both products have to be on screen at once, and the second pane has to be
  // over the same ground, or the two images are not comparable.
  await expect.poll(() => productTiles('n0v').size).toBeGreaterThan(0);
  expect(productTiles('n0q').size).toBeGreaterThan(0);
  const paneViews = () => page.evaluate(() => {
    const primary = document.getElementById('map').dataset;
    const comparison = document.getElementById('compareMap').dataset;
    return {
      primary: `${primary.latitude},${primary.longitude}`,
      comparison: `${comparison.latitude},${comparison.longitude}`
    };
  });
  await expect.poll(async () => {
    const views = await paneViews();
    return views.comparison === views.primary;
  }).toBe(true);
  // The pane really left the comparison city rather than the two happening to agree.
  expect((await paneViews()).comparison).not.toBe('35.4676,-97.5164');

  // The pairing is a setting, not a session detail.
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return stored.settings.compareProduct;
  })).toBe('velocity');
  await page.reload();
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#compareProductSelect')).toHaveValue('velocity');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');

  // IEM only archives the reflectivity composite, so scrubbing back has to
  // mirror the primary rather than pair a live velocity scan with a past scan.
  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('Home');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'reflectivity');
  await expect(page.locator('#compareMapTitle')).toHaveText('Velocity comparison resumes on the live frame');
  await page.locator('#timeline').press('End');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');

  // Clearing the pairing has to hand the pane back to the stored city, which the
  // lock must not have overwritten while it was driving the view.
  await select.selectOption('');
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  await expect(page.locator('#compareSearchInput')).toBeEnabled();
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'reflectivity');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-latitude', '35.4676');
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return Math.round(stored.settings.compareLocation.latitude * 1e4) / 1e4;
  })).toBe(35.4676);
});
