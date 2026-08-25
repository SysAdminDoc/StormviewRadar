import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function setSource(page, source) {
  await page.addInitScript(sourceValue => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: sourceValue,
      delay: 1200,
      autoRefresh: false,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        states: false,
        counties: false,
        labels: false
      }
    }));
  }, source);
}

test('HRRR frames derive valid time from model initialization metadata', async ({ page }) => {
  await setSource(page, 'hrrr');
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-07-25T12:00:00Z',
      forecast_minute: 120,
      model_forecast_utc: '2026-07-25T14:00:00Z'
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://nominatim.openstreetmap.org/search**', route => route.fulfill({
    json: [{ lat: '0', lon: '0', display_name: 'Outside coverage, Atlantic Ocean' }]
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await page.locator('#playBtn').click();
  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('Home');

  const timestamp = page.locator('#timestampBox');
  await expect(timestamp).toHaveAttribute('data-provider-time', '2026-07-25T12:00:00.000Z');
  await expect(timestamp).toHaveAttribute('data-model-init', '2026-07-25T12:00:00.000Z');
  await expect(timestamp).toHaveAttribute('data-kind', 'analysis');
  await expect(page.locator('#fiFrame')).toContainText('Analysis');
  await expect(page.locator('#coverageStatus')).toHaveAttribute('data-state', 'inside');

  await page.locator('#stepFwdBtn').click();
  await expect(timestamp).toHaveAttribute('data-provider-time', '2026-07-25T13:00:00.000Z');
  await expect(timestamp).toHaveAttribute('data-kind', 'forecast');
  await expect(page.locator('#fiFrame')).toContainText('F01 Forecast');

  await page.locator('#searchInput').fill('ocean');
  await page.locator('.search-item[data-lat]').click();
  await expect(page.locator('#coverageStatus')).toHaveAttribute('data-state', 'outside');
  await expect(page.locator('#coverageStatusText')).toContainText('outside CONUS coverage');
});

test('MRMS uses IEM provider metadata rather than the client clock', async ({ page }) => {
  await setSource(page, 'mrms');
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-07-25T20:55:00Z', product: 'N0Q' } }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('MRMS: current');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T20:55:00.000Z');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-kind', 'latest');
  await expect(page.locator('#playback')).toBeVisible();
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuemax', '73');
});

test('RainViewer preserves provider frame timestamps and global coverage', async ({ page }) => {
  await setSource(page, 'rainviewer');
  await page.route('https://api.rainviewer.com/public/weather-maps.json', route => route.fulfill({
    json: {
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [
          { time: 1785012000, path: '/v2/radar/1785012000' },
          { time: 1785012600, path: '/v2/radar/1785012600' }
        ]
      }
    }
  }));
  await page.route('https://tilecache.rainviewer.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('RainViewer: current');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T20:40:00.000Z');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-kind', 'past');
  await expect(page.locator('#coverageStatus')).toHaveAttribute('data-state', 'global');
});

test('failed providers fall back to MRMS with an actionable status', async ({ page }) => {
  await setSource(page, 'rainviewer');
  await page.route('https://api.rainviewer.com/public/weather-maps.json', route => route.fulfill({
    status: 503,
    json: { error: 'provider unavailable' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-07-25T20:55:00Z', product: 'N0Q' } }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  const status = page.locator('#dataStatus');
  await expect(status).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#dataStatusText')).toHaveText('MRMS fallback: RainViewer failed');
  await expect(status).toHaveClass(/retryable/);
  await expect(status).toHaveAttribute('title', /Activate to retry/);
  await expect(page.locator('.sidebar .source-tab.active')).toHaveText('MRMS');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-source', 'mrms');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T20:55:00.000Z');
});

test('nowCOAST reads the default valid time from WMS capabilities', async ({ page }) => {
  await setSource(page, 'nowcoast');
  await page.route('https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows?**', route => {
    const request = new URL(route.request().url()).searchParams.get('request')?.toLowerCase();
    if (request === 'getcapabilities') {
      return route.fulfill({
        contentType: 'application/xml',
        body: `<?xml version="1.0"?>
          <WMS_Capabilities xmlns="http://www.opengis.net/wms">
            <Capability><Layer><Layer>
              <Name>conus_base_reflectivity_mosaic</Name>
              <Dimension name="time" default="2026-07-25T20:48:04Z" units="ISO8601">2026-07-25T20:48:04Z</Dimension>
            </Layer></Layer></Capability>
          </WMS_Capabilities>`
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: transparentPng
    });
  });

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('NOAA WMS: current');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T20:48:04.000Z');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-kind', 'latest');
  await expect(page.locator('#playback')).toBeHidden();
});

test('ECCC GeoMet exposes the official cross-border rain-rate timeline on demand', async ({ page }) => {
  await setSource(page, 'eccc');
  const requestedTimes = new Set();
  const cacheDirectives = [];
  await page.route('https://geo.weather.gc.ca/geomet?**', route => {
    const url = new URL(route.request().url());
    const request = url.searchParams.get('request')?.toLowerCase();
    if (request === 'getcapabilities') {
      return route.fulfill({
        contentType: 'application/xml',
        headers: { 'access-control-allow-origin': '*' },
        body: `<?xml version="1.0"?>
          <WMS_Capabilities xmlns="http://www.opengis.net/wms">
            <Capability><Layer><Layer>
              <Name>RADAR_1KM_RRAI</Name>
              <Title>Radar precipitation rate for rain [mm/h]</Title>
              <EX_GeographicBoundingBox>
                <westBoundLongitude>-170.32</westBoundLongitude><eastBoundLongitude>-50</eastBoundLongitude>
                <southBoundLatitude>16.93</southBoundLatitude><northBoundLatitude>67.19</northBoundLatitude>
              </EX_GeographicBoundingBox>
              <Dimension name="time" units="ISO8601" default="2026-07-25T20:54:00Z">2026-07-25T20:36:00Z/2026-07-25T20:54:00Z/PT6M</Dimension>
            </Layer></Layer></Capability>
          </WMS_Capabilities>`
      });
    }
    requestedTimes.add(url.searchParams.get('time'));
    cacheDirectives.push(route.request().headers()['cache-control'] || '');
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'image/png',
      body: transparentPng
    });
  });

  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('ECCC GeoMet: current');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T20:54:00.000Z');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-source', 'eccc');
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuemax', '4');
  await expect(page.locator('#coverageStatusText')).toContainText('North America coverage');
  await expect(page.locator('.sidebar [data-product="precipRate"]')).toHaveClass(/active/);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Environment and Climate Change Canada');
  await expect.poll(() => requestedTimes.has('2026-07-25T20:54:00.000Z')).toBe(true);
  if (await page.locator('#playIcon rect').count()) await page.locator('#playBtn').click();

  await page.locator('#timeline').focus();
  await page.locator('#timeline').press('Home');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T20:36:00.000Z');
  await expect.poll(() => requestedTimes.has('2026-07-25T20:36:00.000Z')).toBe(true);
  await expect(page.locator('.eccc-radar-frame')).toHaveCount(1);
  expect(cacheDirectives.every(value => !/no-cache/i.test(value))).toBe(true);
});
