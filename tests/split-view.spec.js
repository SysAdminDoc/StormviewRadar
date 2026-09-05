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

function configureMrms(page, extra = {}) {
  return page.addInitScript(overrides => {
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
        delay: 100,
        loop: true,
        reducedData: true,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        },
        ...overrides
      }
    }));
  }, extra);
}

function routeRadar(page, tiles) {
  page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-08-12T18:00:00Z', product: 'N0Q' } }
  }));
  page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => {
    tiles?.push(route.request().url());
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/png',
      body: transparentPng
    });
  });
  page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));
  page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  return page.route('https://nominatim.openstreetmap.org/search?**', route => route.fulfill({
    json: [{ lat: '35.4676', lon: '-97.5164', display_name: 'Oklahoma City, Oklahoma, USA' }]
  }));
}

async function fromSidebar(page, selector) {
  await page.locator('#sidebarToggle').click();
  await expect(page.locator('#sidebar')).toHaveClass(/open/);
  await page.locator(selector).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
}

function expectOverOklahomaCity(page) {
  return expect.poll(() => page.evaluate(() => {
    const { latitude, longitude } = document.getElementById('compareMap').dataset;
    return Math.max(Math.abs(Number(latitude) - 35.4676), Math.abs(Number(longitude) + 97.5164));
  })).toBeLessThan(0.01);
}

function paneViews(page) {
  return page.evaluate(() => {
    const primary = document.getElementById('map').dataset;
    const comparison = document.getElementById('compareMap').dataset;
    return {
      primary: `${primary.latitude},${primary.longitude}`,
      comparison: `${comparison.latitude},${comparison.longitude}`
    };
  });
}

// Park the comparison pane over another city, so a product lock has a view to
// pull back from rather than one that already agrees with the primary.
async function pairOverOklahomaCity(page) {
  await page.locator('#splitViewBtn').click();
  await page.locator('#compareSearchInput').fill('Oklahoma City');
  await page.locator('.compare-search-result').click();
  await expectOverOklahomaCity(page);
  await page.locator('#compareProductSelect').selectOption('velocity');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');
}

test('the comparison pane can carry a second radar product locked to the primary view', async ({ page }) => {
  const tiles = [];
  await configureMrms(page);
  await routeRadar(page, tiles);

  const productTiles = product => new Set(tiles
    .filter(url => url.includes(`nexrad-${product}-900913`))
    .map(url => url.split('900913/')[1]));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');

  const select = page.locator('#compareProductSelect');
  await pairOverOklahomaCity(page);
  await expect(select.locator('option')).toHaveText(['Same product', 'Velocity', 'Echo Tops', 'Precipitation']);
  await expect(page.locator('#compareMapTitle')).toHaveText('Velocity comparison');
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(1);
  await expect(page.locator('#map .radar-layer')).toHaveCount(1);

  // A disabled input cannot be focused, so the reason it is unusable would be
  // unreachable. It stays in the tab order and carries the explanation.
  await expect(page.locator('#compareSearchInput')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#compareSearchLock')).toHaveText(/primary view/);
  await page.locator('#compareSearchInput').focus();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('compareSearchInput');

  // Both products have to be drawn at once over the same ground. Panning the
  // primary a whole screen is the only way to tell a pane that followed from
  // one that happened to start in the same place.
  const beforePan = await paneViews(page);
  tiles.length = 0;
  for (let press = 0; press < 14; press += 1) await page.locator('#map').press('ArrowRight');
  await expect.poll(async () => (await paneViews(page)).primary).not.toBe(beforePan.primary);
  await expect.poll(async () => {
    const views = await paneViews(page);
    return views.comparison === views.primary;
  }).toBe(true);
  expect((await paneViews(page)).comparison).not.toBe('35.4676,-97.5164');

  // The comparison pane fetched its own product for the ground the primary
  // just panned onto. The primary’s own tiles come from the persistent cache
  // and never reach the network, so the zoom of these requests is what says
  // the pane followed: the comparison city sits at zoom 10, the primary at 5.
  await expect.poll(() => productTiles('n0v').size).toBeGreaterThan(0);
  const primaryZoom = await page.locator('#map').getAttribute('data-zoom');
  for (const tile of productTiles('n0v')) expect(tile).toMatch(new RegExp(`^${primaryZoom}/`));

  // Two products on screen at the same time, each with tiles of its own.
  expect(await page.locator('#map .radar-layer img').count()).toBeGreaterThan(0);
  expect(await page.locator('#compareMap .compare-radar-layer img').count()).toBeGreaterThan(0);
  expect(await page.evaluate(() => JSON.parse(
    localStorage.getItem('stormview_settings')
  ).settings.radarProduct)).toBe('reflectivity');

  // Refreshing on the same frame has to reuse the layer. The cache key is built
  // in two places and they have to agree, or the pane is torn down and rebuilt
  // on every refresh.
  await page.evaluate(() => { document.querySelector('#compareMap .compare-radar-layer').dataset.probe = 'kept'; });
  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('End');
  await page.locator('#timeline').press('End');
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveAttribute('data-probe', 'kept');

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

  // Only one frame in the timeline is live, so a pairing that held during
  // playback would show the second product for a single frame per loop. Watch
  // a whole loop go by: the pane mirrors throughout and says why.
  await page.locator('#playBtn').click();
  const seen = new Set();
  const loopMs = Number(await page.locator('#timeline').getAttribute('aria-valuemax')) * 100;
  for (let sample = 0; sample * 50 < loopMs * 1.6; sample += 1) {
    seen.add(await page.locator('#compareMap').getAttribute('data-radar-product'));
    await page.waitForTimeout(50);
  }
  expect([...seen]).toEqual(['reflectivity']);
  await expect(page.locator('#compareMapTitle')).toHaveText('Velocity comparison resumes on the live frame');
  await page.locator('#playBtn').click();
  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('End');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');

  // The marker other assertions read has to go away with the layer it describes.
  await fromSidebar(page, '.sidebar [data-layer="radar"]');
  await expect(page.locator('#compareMap .compare-radar-layer')).toHaveCount(0);
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', '');
  await fromSidebar(page, '.sidebar [data-layer="radar"]');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');

  // Clearing the pairing has to hand the pane back to the stored city, which the
  // lock must not have overwritten while it was driving the view.
  await select.selectOption('');
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  await expect(page.locator('#compareSearchInput')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'reflectivity');
  await expectOverOklahomaCity(page);
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings'));
    return Math.round(stored.settings.compareLocation.latitude * 1e4) / 1e4;
  })).toBe(35.4676);
});

test('a pairing that stops applying hands the pane back instead of stranding it', async ({ page }) => {
  await configureMrms(page, { language: 'es' });
  await routeRadar(page);

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await pairOverOklahomaCity(page);

  // Every product the control offers has to be readable in the selected
  // language, not only the two the sidebar already used.
  const select = page.locator('#compareProductSelect');
  await expect(select.locator('option')).toHaveText(['Mismo producto', 'Velocidad', 'Topes de eco', 'Precipitación']);
  await expect(page.locator('#compareMapTitle')).toHaveText('Comparación de Velocidad');

  const paired = await paneViews(page);
  expect(paired.comparison).not.toBe('35.4676,-97.5164');

  // Making the primary show the compared product ends the pairing without the
  // select being touched. The pane is over the primary at that moment, so it
  // has to be handed back, or the title names a city it is not over and the
  // next drag saves the primary coordinates under that name.
  await fromSidebar(page, '.sidebar [data-product="velocity"]');
  await expectOverOklahomaCity(page);
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  await expect(select.locator('option')).toHaveText(['Mismo producto', 'Reflectividad', 'Topes de eco', 'Precipitación']);
  await expect(page.locator('#compareSearchInput')).toHaveAttribute('aria-disabled', 'false');

  // The choice survives the collision, so putting the primary back resumes it,
  // and it has to survive in storage rather than only in memory.
  await page.reload();
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');
  await fromSidebar(page, '.sidebar [data-product="reflectivity"]');
  await expect(page.locator('#compareMap')).toHaveAttribute('data-radar-product', 'velocity');
  await expect(page.locator('#compareMapTitle')).toHaveText('Comparación de Velocidad');

  // A source with only one product ends it the same way, and hides the control.
  await fromSidebar(page, '.sidebar [data-source="hrrr"]');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(select).toBeHidden();
  await expectOverOklahomaCity(page);
  await expect(page.locator('#compareMapTitle')).toHaveText('Oklahoma City, Oklahoma');

  // Nothing overwrote the stored city on the way through either transition.
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_settings')).settings.compareLocation;
    return [stored.name, Math.round(stored.latitude * 1e4) / 1e4];
  })).toEqual(['Oklahoma City, Oklahoma', 35.4676]);
});
