import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { version: appVersion } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function prepareApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      basemap: 'satellite',
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
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
}

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test('active map providers and bundled identity assets remain visible', async ({ page }) => {
  await page.goto('/');

  const attribution = page.locator('.leaflet-control-attribution');
  await expect(attribution).toBeVisible();
  await expect(attribution).toContainText('Esri');
  await expect(attribution).toContainText('Iowa Environmental Mesonet');
  await expect(page.locator('.data-credit a[href="https://www.rainviewer.com/"]')).toBeVisible();
  await expect(page.locator('.data-credit a[href="https://www.weather.gov/"]')).toBeVisible();
  await expect(page.locator('.data-credit a[href*="eccc-msc.github.io/open-data/licence"]')).toHaveText('ECCC');
  await expect(page.locator('img[src*="raw.githubusercontent.com"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'logo/StormView-512x512.png');
  await expect(page.locator('meta[name="application-version"]')).toHaveAttribute('content', appVersion);
  await expect(page).toHaveTitle(`StormView Radar ${appVersion}`);
});

test('Nominatim search is identified and serialized to one request per second', async ({ page }) => {
  const requests = [];
  await page.route('https://nominatim.openstreetmap.org/search**', route => {
    requests.push({ at: Date.now(), url: new URL(route.request().url()) });
    return route.fulfill({
      json: [{ lat: '39', lon: '-96', display_name: `Result ${requests.length}, Test County, TS` }]
    });
  });

  await page.goto('/');
  await page.locator('#searchInput').fill('first');
  await expect(page.locator('.search-item-name')).toHaveText('Result 1');
  await page.locator('#searchInput').fill('second');
  await expect(page.locator('.search-item-name')).toHaveText('Result 2');

  expect(requests).toHaveLength(2);
  expect(requests[1].at - requests[0].at).toBeGreaterThanOrEqual(900);
  expect(requests[1].url.searchParams.get('format')).toBe('jsonv2');
  expect(requests[1].url.searchParams.get('limit')).toBe('5');
  expect(requests[1].url.searchParams.get('email')).toBe('matt_parker@outlook.com');
});

test('runtime assets are local and CSP blocks an unapproved connection origin', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="stylesheet"][href="vendor/leaflet/leaflet.css"]')).toHaveCount(1);
  await expect(page.locator('link[rel="stylesheet"][href="vendor/cesium/Widgets/widgets.css"]')).toHaveCount(1);
  await expect(page.locator('script[src="vendor/leaflet/leaflet.js"]')).toHaveCount(1);
  await expect(page.locator('script[src="vendor/topojson/topojson-client.min.js"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => typeof window.L === 'object' && typeof window.topojson === 'object')).toBe(true);

  const unapprovedRequestSucceeded = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/stormview-csp-probe');
      return true;
    } catch {
      return false;
    }
  });
  expect(unapprovedRequestSucceeded).toBe(false);
});

test('boundaries load from the repository and no third-party CDN is reachable', async ({ page }) => {
  const hosts = new Set();
  page.on('request', request => hosts.add(new URL(request.url()).host));

  // The shared fixture disables boundaries; this test is about them.
  await page.addInitScript(() => {
    const stored = JSON.parse(localStorage.getItem('stormview_pro_v3') || '{}');
    stored.layers = { ...stored.layers, states: true, counties: true };
    localStorage.setItem('stormview_pro_v3', JSON.stringify(stored));
  });

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => performance
    .getEntriesByType('resource')
    .filter(entry => entry.name.includes('us-atlas'))
    .length)).toBe(2);

  const topologies = await page.evaluate(() => performance
    .getEntriesByType('resource')
    .filter(entry => entry.name.includes('us-atlas'))
    .map(entry => new URL(entry.name).host));
  const origin = new URL(page.url()).host;
  expect(topologies).toEqual([origin, origin]);

  // The boundary layer uses a canvas renderer, so proving it drew means
  // sampling pixels rather than counting SVG paths.
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('.leaflet-boundary-pane canvas');
    if (!canvas || !canvas.width) return 0;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] > 0) painted += 1;
    return painted;
  }), { timeout: 20000 }).toBeGreaterThan(1000);

  expect([...hosts].filter(host => host.includes('jsdelivr'))).toEqual([]);
});

test('official SPC discussions render without a false PIREP product', async ({ page }) => {
  await page.route('https://www.spc.noaa.gov/products/spcmdrss.xml', route => route.fulfill({
    contentType: 'application/rss+xml',
    body: `<?xml version="1.0"?><rss><channel><item>
      <title>Mesoscale Discussion 1799</title>
      <link>https://www.spc.noaa.gov/products/md/md1799.html</link>
      <description>Severe-weather discussion</description>
      <pubDate>Wed, 29 Jul 2026 20:40:00 +0000</pubDate>
    </item></channel></rss>`
  }));
  await page.route('https://www.spc.noaa.gov/products/md/md1799.html', route => route.fulfill({
    contentType: 'text/html',
    body: `<pre>
      Mesoscale Discussion 1799
      Areas affected...Southern Georgia into northern Florida
      Concerning...Severe Thunderstorm Watch 532...
      Valid 292040Z - 292245Z
      SUMMARY...Damaging wind and isolated large hail remain possible.
      DISCUSSION...Additional technical detail.
      LAT...LON 30128117 29888235 30248425 31378709 30128117
    </pre>`
  }));

  await page.goto('/');
  await expect(page.locator('[data-layer="pireps"]')).toHaveCount(0);
  await expect(page.getByText('PIREPs', { exact: true })).toHaveCount(0);

  const control = page.locator('.sidebar [data-layer="spcMCD"]');
  await control.evaluate(element => element.click());
  await expect(control).toHaveAttribute('data-feature-count', '1');
  const discussion = page.locator('.spc-mcd-layer');
  await expect(discussion).toHaveCount(1);
  await discussion.click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('Mesoscale Discussion 1799');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Southern Georgia into northern Florida');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Damaging wind');
});
