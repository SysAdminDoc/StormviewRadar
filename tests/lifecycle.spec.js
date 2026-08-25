import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const overlayFeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {
      event: 'Tornado Watch',
      headline: 'Test overlay',
      LABEL: '15'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[-100, 35], [-95, 35], [-95, 40], [-100, 40], [-100, 35]]]
    }
  }]
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      autoRefresh: false,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        stormReports: false,
        lightning: false,
        riverGauges: false,
        surfaceObs: false,
        states: false,
        counties: false,
        labels: false
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
});

test('repeated lightning toggles retain exactly one tile resource set', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('[data-layer="lightning"]').first();
  const lightningLayers = page.locator('.leaflet-layer.lightning-layer');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await toggle.evaluate(element => element.click());
    await expect(lightningLayers).toHaveCount(1);
    await toggle.evaluate(element => element.click());
    await expect(lightningLayers).toHaveCount(0);
  }
});

test('river gauges use the visible bbox and enforce the marker budget', async ({ page }) => {
  let requestUrl;
  await page.route('https://waterservices.usgs.gov/nwis/iv/**', route => {
    requestUrl = new URL(route.request().url());
    const [west, south, east, north] = requestUrl.searchParams.get('bBox').split(',').map(Number);
    const timeSeries = Array.from({ length: 300 }, (_, index) => {
      const row = Math.floor(index / 20);
      const column = index % 20;
      return {
        sourceInfo: {
          siteName: `Gauge ${index}`,
          geoLocation: {
            geogLocation: {
              latitude: south + ((north - south) * (row + 0.5) / 15),
              longitude: west + ((east - west) * (column + 0.5) / 20)
            }
          }
        },
        values: [{ value: [{ value: String(index) }] }]
      };
    });
    return route.fulfill({ json: { value: { timeSeries } } });
  });

  await page.goto('/');
  const toggle = page.locator('[data-layer="riverGauges"]').first();
  await toggle.evaluate(element => element.click());
  await expect(toggle).toHaveClass(/active/);
  await expect.poll(() => requestUrl?.searchParams.get('bBox')).toBeTruthy();
  expect(requestUrl.searchParams.get('bBox')).not.toBe('-125.0000,24.0000,-66.0000,50.0000');

  await expect.poll(async () => Number(await toggle.getAttribute('data-feature-count'))).toBeGreaterThan(0);
  expect(Number(await toggle.getAttribute('data-feature-count'))).toBeLessThanOrEqual(250);

  await toggle.evaluate(element => element.click());
  await expect(toggle).toHaveAttribute('data-feature-count', '0');
});

test('Iowa road events disclose bounded coverage, freshness, and grouped closures', async ({ page }) => {
  let requestUrl;
  await page.route('https://services.arcgis.com/**/CARS511_Iowa_View/FeatureServer/0/query?**', route => {
    requestUrl = new URL(route.request().url());
    return route.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              OBJECTID: 1,
              ID: 'IACARS4-82461',
              STYLE: 'closure',
              headline: '<img src=x onerror=alert(1)> Bus 30 closed',
              phrase: 'Closed',
              Route: 'Bus 30',
              msg0: 'Closed due to road construction.',
              EditDate: 1786533787662,
              linktxt: 'https://511ia.org/event/IACARS4-82461'
            },
            geometry: { type: 'Point', coordinates: [-92.58, 41.98] }
          },
          {
            type: 'Feature',
            properties: {
              OBJECTID: 2,
              ID: 'IACARS4-82461',
              STYLE: 'closure',
              EditDate: 1786533787662
            },
            geometry: { type: 'Point', coordinates: [-92.57, 41.99] }
          },
          {
            type: 'Feature',
            properties: {
              OBJECTID: 3,
              ID: 'IADOT-ROADWORK',
              STYLE: 'roadwork',
              headline: 'I-80 road construction',
              Route: 'I-80',
              EditDate: 1786533787000
            },
            geometry: { type: 'Point', coordinates: [-93.62, 41.59] }
          }
        ]
      }
    });
  });

  await page.goto('/');
  const toggle = page.locator('.sidebar [data-layer="highways"]');
  await toggle.evaluate(element => element.click());

  await expect.poll(() => requestUrl?.searchParams.get('geometry')).toBeTruthy();
  expect(requestUrl.searchParams.get('geometry')).toContain('-96.70000');
  expect(requestUrl.searchParams.get('where')).toContain('closure');
  await expect(toggle).toHaveAttribute('data-feature-count', '2');
  await expect(toggle).toHaveAttribute('data-load-state', 'current');
  await expect(page.locator('.road-event-marker')).toHaveCount(3);

  const firstMarker = page.locator('.road-event-marker').first();
  await firstMarker.hover();
  await expect(page.locator('.leaflet-tooltip')).toContainText('Bus 30');
  await expect(page.locator('.leaflet-tooltip img')).toHaveCount(0);

  await firstMarker.click();
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText('Iowa-only coverage');
  await expect(popup.locator('img')).toHaveCount(0);
  await expect(popup.locator('a[href="https://511ia.org/event/IACARS4-82461"]')).toBeVisible();

  await toggle.evaluate(element => element.click());
  await expect(page.locator('.road-event-marker')).toHaveCount(0);
  await expect(toggle).toHaveAttribute('data-feature-count', '0');
});

test('overlay opacity is independent, persisted, and applied to future layer loads', async ({ page }) => {
  await page.route('https://services.arcgis.com/**/CARS511_Iowa_View/FeatureServer/0/query?**', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          OBJECTID: 1,
          ID: 'IADOT-OPACITY',
          STYLE: 'roadwork',
          headline: 'I-80 road construction',
          Route: 'I-80',
          EditDate: 1786533787000
        },
        geometry: { type: 'Point', coordinates: [-93.62, 41.59] }
      }]
    }
  }));

  await page.goto('/');
  const toggle = page.locator('.sidebar [data-layer="highways"]');
  await toggle.evaluate(element => element.click());
  await expect(page.locator('.road-event-marker')).toHaveCount(1);

  await page.locator('#settingsBtn').click();
  await page.locator('#overlayOpacityLayerSelect').selectOption('highways');
  await page.locator('#overlayOpacitySlider').evaluate(element => {
    element.value = '0.35';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect(page.locator('#overlayOpacityValue')).toHaveText('35%');
  await expect(page.locator('.road-event-marker')).toHaveCSS('opacity', '0.35');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_settings')));
  expect(stored.schemaVersion).toBe(9);
  expect(stored.settings.layerOpacity.highways).toBe(0.35);
  expect(stored.settings.layerOpacity.alerts).toBe(1);

  await page.reload();
  await expect(page.locator('.road-event-marker')).toHaveCount(1);
  await expect(page.locator('.road-event-marker')).toHaveCSS('opacity', '0.35');
});

const delayedOverlayScenarios = [
  {
    layer: 'spcWatches',
    url: 'https://api.weather.gov/alerts/active?event=Tornado%20Watch,Severe%20Thunderstorm%20Watch',
    response: { json: overlayFeatureCollection }
  },
  {
    layer: 'spcMCD',
    url: 'https://www.spc.noaa.gov/products/spcmdrss.xml',
    response: {
      contentType: 'application/rss+xml',
      body: '<?xml version="1.0"?><rss><channel><item><link>https://www.spc.noaa.gov/products/md/md1799.html</link></item></channel></rss>'
    }
  },
  {
    layer: 'spcTornado',
    url: 'https://www.spc.noaa.gov/products/outlook/day1otlk_torn.nolyr.geojson',
    response: { json: overlayFeatureCollection }
  },
  {
    layer: 'spcWind',
    url: 'https://www.spc.noaa.gov/products/outlook/day1otlk_wind.nolyr.geojson',
    response: { json: overlayFeatureCollection }
  },
  {
    layer: 'spcHail',
    url: 'https://www.spc.noaa.gov/products/outlook/day1otlk_hail.nolyr.geojson',
    response: { json: overlayFeatureCollection }
  },
  {
    layer: 'sigmets',
    url: 'https://api.weather.gov/alerts/active?event=SIGMET,Convective%20SIGMET,AIRMET',
    response: { json: overlayFeatureCollection }
  }
];

for (const scenario of delayedOverlayScenarios) {
  test(`${scenario.layer} cannot resurrect after a delayed response`, async ({ page }) => {
    let releaseResponse;
    let markStarted;
    const responseGate = new Promise(resolve => { releaseResponse = resolve; });
    const requestStarted = new Promise(resolve => { markStarted = resolve; });
    await page.route(scenario.url, async route => {
      markStarted();
      await responseGate;
      try {
        await route.fulfill(scenario.response);
      } catch {
        // The expected abort may finish the route before the delayed fixture is released.
      }
    });

    await page.goto('/');
    const control = page.locator(`.sidebar [data-layer="${scenario.layer}"]`);
    await control.evaluate(element => element.click());
    await requestStarted;
    await expect(control).toHaveAttribute('data-load-state', 'loading');
    await control.evaluate(element => element.click());
    releaseResponse();
    await page.waitForTimeout(100);

    await expect(control).not.toHaveClass(/active/);
    await expect(control).toHaveAttribute('data-feature-count', '0');
    await expect(control).toHaveAttribute('data-load-state', 'disabled');
  });
}

test('overlay diagnostics distinguish stale data and retrying requests', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      autoRefresh: false,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        spcWatches: true,
        states: false,
        counties: false,
        labels: false
      }
    }));
  });

  let watchRequests = 0;
  let releaseRetry;
  const retryGate = new Promise(resolve => { releaseRetry = resolve; });
  await page.route(
    'https://api.weather.gov/alerts/active?event=Tornado%20Watch,Severe%20Thunderstorm%20Watch',
    async route => {
      watchRequests += 1;
      if (watchRequests === 2) {
        await route.fulfill({ status: 503, json: { error: 'temporary failure' } });
        return;
      }
      if (watchRequests === 3) await retryGate;
      await route.fulfill({ json: overlayFeatureCollection });
    }
  );

  await page.goto('/');
  const control = page.locator('.sidebar [data-layer="spcWatches"]');
  await expect(control).toHaveAttribute('data-load-state', 'current');
  await expect(control).toHaveAttribute('data-feature-count', '1');

  await page.locator('#refreshBtn').click();
  await expect(control).toHaveAttribute('data-load-state', 'stale');
  await expect(control).toHaveAttribute('data-feature-count', '1');

  await page.locator('#refreshBtn').click();
  await expect(control).toHaveAttribute('data-load-state', 'retrying');
  releaseRetry();
  await expect(control).toHaveAttribute('data-load-state', 'current');

  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="diagnostics"]').click();
  await expect(page.locator('#diagOverlays')).toContainText('SPC Watches: current');
});

test('overlay diagnostics distinguish empty and initial failure states', async ({ page }) => {
  await page.route(
    'https://www.spc.noaa.gov/products/outlook/day1otlk_torn.nolyr.geojson',
    route => route.fulfill({ json: { type: 'FeatureCollection', features: [] } })
  );
  await page.route(
    'https://api.weather.gov/alerts/active?event=SIGMET,Convective%20SIGMET,AIRMET',
    route => route.fulfill({ status: 503, json: { error: 'temporary failure' } })
  );

  await page.goto('/');
  const tornado = page.locator('.sidebar [data-layer="spcTornado"]');
  const sigmets = page.locator('.sidebar [data-layer="sigmets"]');
  await tornado.evaluate(element => element.click());
  await sigmets.evaluate(element => element.click());
  await expect(tornado).toHaveAttribute('data-load-state', 'empty');
  await expect(sigmets).toHaveAttribute('data-load-state', 'failed');
  await expect(tornado).toHaveAttribute('data-feature-count', '0');
  await expect(sigmets).toHaveAttribute('data-feature-count', '0');
});
